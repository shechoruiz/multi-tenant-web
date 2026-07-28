import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { PrismaClient } from "@shelf/db";
import { requireRole } from "../middleware/require-role.js";
import { Role } from "@shelf/shared";

const prisma = new PrismaClient();

export async function cartRoutes(app: FastifyInstance): Promise<void> {
  // All cart routes require authentication
  app.addHook("onRequest", requireRole(Role.customer));

  // GET /:tenantSlug/cart — get current user's cart with calculated prices
  app.get("/:tenantSlug/cart", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    const userId = request.user?.userId;
    if (!tenantId || !userId) return reply.status(401).send({ error: "Unauthorized" });

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: {
                  select: { url: true },
                  orderBy: { sortOrder: "asc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return reply.send({ items: [], total: 0 });
    }

    const items = cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productImage: item.product.images[0]?.url ?? null,
      price: Number(item.product.price),
      quantity: item.quantity,
      subtotal: Number(item.product.price) * item.quantity,
    }));

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    return reply.send({
      id: cart.id,
      userId: cart.userId,
      tenantId: cart.tenantId,
      items,
      total,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    });
  });

  // POST /:tenantSlug/cart/items — add item to cart
  app.post("/:tenantSlug/cart/items", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    const userId = request.user?.userId;
    if (!tenantId || !userId) return reply.status(401).send({ error: "Unauthorized" });

    const { productId, quantity } = request.body as { productId: string; quantity: number };

    if (!productId || !quantity || quantity < 1) {
      return reply.status(400).send({ error: "productId and quantity (>0) are required" });
    }

    // Verify product exists and belongs to tenant
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product || product.status === "inactive") {
      return reply.status(404).send({ error: "Product not found" });
    }

    // Check stock
    if (product.stock < quantity) {
      return reply.status(409).send({ error: "Insufficient stock" });
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId, tenantId },
      });
    }

    // Check if item already exists in cart
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) {
        return reply.status(409).send({ error: "Insufficient stock" });
      }
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }

    return reply.status(201).send({ message: "Item added to cart" });
  });

  // PATCH /:tenantSlug/cart/items/:itemId — update item quantity
  app.patch("/:tenantSlug/cart/items/:itemId", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    const userId = request.user?.userId;
    if (!tenantId || !userId) return reply.status(401).send({ error: "Unauthorized" });

    const { itemId } = request.params as { itemId: string };
    const { quantity } = request.body as { quantity: number };

    if (quantity === undefined || quantity < 0) {
      return reply.status(400).send({ error: "quantity (>=0) is required" });
    }

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return reply.status(404).send({ error: "Cart not found" });

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true },
    });
    if (!item) return reply.status(404).send({ error: "Item not found" });

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      return reply.send({ message: "Item removed" });
    }

    if (quantity > item.product.stock) {
      return reply.status(409).send({ error: "Insufficient stock" });
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return reply.send({ message: "Quantity updated" });
  });

  // DELETE /:tenantSlug/cart/items/:itemId — remove item
  app.delete("/:tenantSlug/cart/items/:itemId", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    const userId = request.user?.userId;
    if (!tenantId || !userId) return reply.status(401).send({ error: "Unauthorized" });

    const { itemId } = request.params as { itemId: string };

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return reply.status(404).send({ error: "Cart not found" });

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) return reply.status(404).send({ error: "Item not found" });

    await prisma.cartItem.delete({ where: { id: itemId } });
    return reply.status(204).send();
  });

  // DELETE /:tenantSlug/cart — clear entire cart
  app.delete("/:tenantSlug/cart", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.userId;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return reply.status(404).send({ error: "Cart not found" });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return reply.status(204).send();
  });
}
