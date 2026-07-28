import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { PrismaClient } from "@shelf/db";

const prisma = new PrismaClient();

export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  // ── Public catalog (no auth required) ─────────────────────────────────────────

  // GET /:tenantSlug/products — list active products for the tenant
  app.get("/:tenantSlug/products", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const { search, categoryId, minPrice, maxPrice } = request.query as {
      search?: string;
      categoryId?: string;
      minPrice?: string;
      maxPrice?: string;
    };

    const where: Record<string, unknown> = {
      tenantId,
      status: "active",
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice);
      if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where: where as any,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: {
          select: { url: true, altText: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return products;
  });

  // GET /:tenantSlug/products/:id — get product detail
  app.get("/:tenantSlug/products/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const { id } = request.params as { id: string };

    const product = await prisma.product.findFirst({
      where: { id, tenantId, status: "active" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: {
          select: { url: true, altText: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) {
      return reply.status(404).send({ error: "Product not found" });
    }

    return product;
  });

  // GET /:tenantSlug/categories — list categories as a tree
  app.get("/:tenantSlug/categories", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const allCategories = await prisma.category.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
      },
      orderBy: { name: "asc" },
    });

    // Build tree structure
    const map = new Map<string, Record<string, unknown>>();
    const roots: Record<string, unknown>[] = [];

    for (const cat of allCategories) {
      map.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of allCategories) {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        (map.get(cat.parentId)!.children as unknown[]).push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  });
}
