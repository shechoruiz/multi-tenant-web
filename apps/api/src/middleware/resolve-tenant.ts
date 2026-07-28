import { type FastifyInstance, type FastifyRequest } from "fastify";
import { PrismaClient } from "@shelf/db";

const prisma = new PrismaClient();

declare module "fastify" {
  interface FastifyRequest {
    tenantId?: string;
    tenantSlug?: string;
  }
}

export async function resolveTenant(request: FastifyRequest): Promise<void> {
  // Extract slug from path: /:tenantSlug/*
  const parts = request.url.split("/").filter(Boolean);
  const slug = parts[0];

  if (!slug || slug.startsWith("auth") || slug === "health") return;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, isActive: true },
  });

  if (!tenant || !tenant.isActive) {
    throw {
      statusCode: 404,
      message: "Not found",
    };
  }

  request.tenantId = tenant.id;
  request.tenantSlug = tenant.slug;
}

export async function registerTenantResolver(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", resolveTenant);
}
