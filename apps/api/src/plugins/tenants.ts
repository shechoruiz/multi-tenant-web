import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { PrismaClient } from "@shelf/db";
import { type CreateTenantDTO, type UpdateThemeDTO } from "@shelf/shared";
import { requireRole } from "../middleware/require-role.js";
import { Role } from "@shelf/shared";

const prisma = new PrismaClient();

export async function tenantRoutes(app: FastifyInstance): Promise<void> {
  // ── Super-admin only ─────────────────────────────────────────────────────────

  // GET /api/tenants — list all tenants (super-admin only)
  app.get("/api/tenants", { preHandler: [requireRole(Role.super_admin)] }, async () => {
    const tenants = await prisma.tenant.findMany({
      include: { theme: true },
      orderBy: { createdAt: "desc" },
    });
    return tenants;
  });

  // POST /api/tenants — create tenant (super-admin only)
  app.post("/api/tenants", { preHandler: [requireRole(Role.super_admin)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as CreateTenantDTO;

    if (!body.name || !body.slug || !body.email) {
      return reply.status(400).send({ error: "name, slug and email are required" });
    }

    const existing = await prisma.tenant.findUnique({ where: { slug: body.slug } });
    if (existing) {
      return reply.status(409).send({ error: "Slug already exists" });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: body.name,
        slug: body.slug,
        email: body.email,
        isActive: body.isActive ?? true,
      },
    });

    return reply.status(201).send(tenant);
  });

  // GET /api/tenants/:id — get tenant detail (super-admin only)
  app.get("/api/tenants/:id", { preHandler: [requireRole(Role.super_admin)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { theme: true, users: { select: { id: true, email: true, name: true, role: true } } },
    });

    if (!tenant) {
      return reply.status(404).send({ error: "Tenant not found" });
    }

    return tenant;
  });

  // PATCH /api/tenants/:id — update tenant (super-admin only)
  app.patch("/api/tenants/:id", { preHandler: [requireRole(Role.super_admin)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<CreateTenantDTO>;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return reply.status(404).send({ error: "Tenant not found" });
    }

    if (body.slug && body.slug !== tenant.slug) {
      const slugExists = await prisma.tenant.findUnique({ where: { slug: body.slug } });
      if (slugExists) {
        return reply.status(409).send({ error: "Slug already exists" });
      }
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: body,
    });

    return updated;
  });

  // ── Theme management (tenant-scoped) ─────────────────────────────────────────

  // GET /:tenantSlug/admin/theme — get current theme
  app.get("/:tenantSlug/admin/theme", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const theme = await prisma.tenantTheme.findUnique({
      where: { tenantId },
    });

    return theme ?? {};
  });

  // PUT /:tenantSlug/admin/theme — draft theme changes (preview)
  app.put("/:tenantSlug/admin/theme", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const body = request.body as UpdateThemeDTO;

    const theme = await prisma.tenantTheme.upsert({
      where: { tenantId },
      create: {
        tenantId,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        accentColor: body.accentColor,
        logoUrl: body.logoUrl,
        faviconUrl: body.faviconUrl,
        fontFamily: body.fontFamily,
      },
      update: {
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        accentColor: body.accentColor,
        logoUrl: body.logoUrl,
        faviconUrl: body.faviconUrl,
        fontFamily: body.fontFamily,
      },
    });

    return theme;
  });

  // GET /:tenantSlug/theme — public theme (published, no auth required)
  app.get("/:tenantSlug/theme", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(404).send({ error: "Tenant not found" });

    const theme = await prisma.tenantTheme.findUnique({ where: { tenantId } });

    return theme ?? {};
  });
}
