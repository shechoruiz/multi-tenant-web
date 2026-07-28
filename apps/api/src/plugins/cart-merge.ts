import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { PrismaClient } from "@shelf/db";
import { requireRole } from "../middleware/require-role.js";
import { Role } from "@shelf/shared";
import { validateCartItems } from "../middleware/validate-cart.js";

const prisma = new PrismaClient();

export async function cartMergeRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", requireRole(Role.customer));

  // POST /:tenantSlug/cart/merge — merge anonymous cart into authenticated cart
  app.post("/:tenantSlug/cart/merge", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    const userId = request.user?.userId;
    if (!tenantId || !userId) return reply.status(401).send({ error: "Unauthorized" });

    const { items } = request.body as {
      items: Array<{ productId: string; quantity: number }>;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return reply.status(400).send({ error: "items array is required" });
    }

    // Validate all items against the tenant
    const { valid, warnings } = await validateCartItems(tenantId, items);

    // Get or create cart
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId, tenantId } });
    }

    // Merge valid items into cart
    for (const item of valid) {
      const existing = await prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
      });

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
        });
      }
    }

    // Build response
    const fullCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
          },
        },
      },
    });

    const cartItems = (fullCart?.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productImage: item.product.images[0]?.url ?? null,
      price: Number(item.product.price),
      quantity: item.quantity,
      subtotal: Number(item.product.price) * item.quantity,
    }));

    const total = cartItems.reduce((sum, i) => sum + i.subtotal, 0);

    return reply.send({
      cart: {
        id: fullCart!.id,
        userId: fullCart!.userId,
        tenantId: fullCart!.tenantId,
        items: cartItems,
        total,
        createdAt: fullCart!.createdAt.toISOString(),
        updatedAt: fullCart!.updatedAt.toISOString(),
      },
      warnings: warnings.map((w) => ({
        type: w.available === 0 ? "product_removed" as const : "stock_adjusted" as const,
        productId: w.productId,
        productName: w.productName,
        message: w.available === 0
          ? `${w.productName} is no longer available and was removed`
          : `${w.productName} stock adjusted from ${w.requested} to ${w.available}`,
      })),
    });
  });
}
