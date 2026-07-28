import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { PrismaClient } from "@shelf/db";
import { Role } from "@shelf/shared";
import { requireRole } from "../middleware/require-role.js";

const prisma = new PrismaClient();

export async function adminCatalogRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin require at least staff role
  app.addHook("onRequest", requireRole(Role.staff));

  // ── Products ──────────────────────────────────────────────────────────────────

  // GET /:tenantSlug/admin/products — list all products (including inactive)
  app.get("/:tenantSlug/admin/products", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const { search, categoryId, status, minPrice, maxPrice } = request.query as {
      search?: string;
      categoryId?: string;
      status?: string;
      minPrice?: string;
      maxPrice?: string;
    };

    const where: Record<string, unknown> = { tenantId };

    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice);
      if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where: where as any,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return products;
  });

  // GET /:tenantSlug/admin/products/:id — get product with all details
  app.get("/:tenantSlug/admin/products/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const { id } = request.params as { id: string };

    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) {
      return reply.status(404).send({ error: "Product not found" });
    }

    return product;
  });

  // POST /:tenantSlug/admin/products — create product
  app.post("/:tenantSlug/admin/products", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const body = request.body as {
      name: string;
      description?: string;
      price: number;
      sku: string;
      stock?: number;
      status?: string;
      categoryId?: string;
    };

    if (!body.name || body.price === undefined || !body.sku) {
      return reply.status(400).send({ error: "name, price and sku are required" });
    }

    // Check SKU uniqueness within tenant
    const existing = await prisma.product.findFirst({
      where: { sku: body.sku, tenantId },
    });
    if (existing) {
      return reply.status(409).send({ error: "SKU already exists in this tenant" });
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        sku: body.sku,
        stock: body.stock ?? 0,
        status: (body.status as any) ?? "active",
        categoryId: body.categoryId,
        tenantId,
      },
      include: {
        images: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return reply.status(201).send(product);
  });

  // PATCH /:tenantSlug/admin/products/:id — update product
  app.patch("/:tenantSlug/admin/products/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const product = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) {
      return reply.status(404).send({ error: "Product not found" });
    }

    // Check SKU uniqueness if changing it
    if (body.sku && body.sku !== product.sku) {
      const skuExists = await prisma.product.findFirst({
        where: { sku: body.sku as string, tenantId, id: { not: id } },
      });
      if (skuExists) {
        return reply.status(409).send({ error: "SKU already exists in this tenant" });
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: body,
      include: {
        images: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return updated;
  });

  // DELETE /:tenantSlug/admin/products/:id — delete product
  app.delete("/:tenantSlug/admin/products/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const { id } = request.params as { id: string };

    const product = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) {
      return reply.status(404).send({ error: "Product not found" });
    }

    // Staff cannot delete
    if (request.user?.role === Role.staff) {
      return reply.status(403).send({ error: "Staff cannot delete products" });
    }

    await prisma.productImage.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    return reply.status(204).send();
  });

  // ── Categories ────────────────────────────────────────────────────────────────

  // GET /:tenantSlug/admin/categories — list all categories flat
  app.get("/:tenantSlug/admin/categories", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const categories = await prisma.category.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });

    return categories;
  });

  // POST /:tenantSlug/admin/categories — create category
  app.post("/:tenantSlug/admin/categories", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const body = request.body as { name: string; slug: string; parentId?: string };

    if (!body.name || !body.slug) {
      return reply.status(400).send({ error: "name and slug are required" });
    }

    // Check slug uniqueness within tenant
    const existing = await prisma.category.findFirst({
      where: { slug: body.slug, tenantId },
    });
    if (existing) {
      return reply.status(409).send({ error: "Category slug already exists" });
    }

    // Verify parent belongs to the same tenant
    if (body.parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: body.parentId, tenantId },
      });
      if (!parent) {
        return reply.status(400).send({ error: "Parent category not found in this tenant" });
      }
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug: body.slug,
        parentId: body.parentId,
        tenantId,
      },
    });

    return reply.status(201).send(category);
  });

  // PATCH /:tenantSlug/admin/categories/:id — update category
  app.patch("/:tenantSlug/admin/categories/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; slug?: string; parentId?: string | null };

    const category = await prisma.category.findFirst({ where: { id, tenantId } });
    if (!category) {
      return reply.status(404).send({ error: "Category not found" });
    }

    if (body.slug && body.slug !== category.slug) {
      const slugExists = await prisma.category.findFirst({
        where: { slug: body.slug, tenantId, id: { not: id } },
      });
      if (slugExists) {
        return reply.status(409).send({ error: "Category slug already exists" });
      }
    }

    // Prevent setting parent to self
    if (body.parentId === id) {
      return reply.status(400).send({ error: "Category cannot be its own parent" });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: body,
    });

    return updated;
  });

  // DELETE /:tenantSlug/admin/categories/:id — delete category
  app.delete("/:tenantSlug/admin/categories/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const { id } = request.params as { id: string };

    const category = await prisma.category.findFirst({ where: { id, tenantId } });
    if (!category) {
      return reply.status(404).send({ error: "Category not found" });
    }

    // Check for child categories
    const children = await prisma.category.findMany({ where: { parentId: id } });
    if (children.length > 0) {
      return reply.status(409).send({
        error: "Cannot delete category with subcategories. Remove or reassign them first.",
      });
    }

    // Unlink products from this category
    await prisma.product.updateMany({
      where: { categoryId: id, tenantId },
      data: { categoryId: null },
    });

    await prisma.category.delete({ where: { id } });

    return reply.status(204).send();
  });
}
