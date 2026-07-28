import { PrismaClient } from "@shelf/db";
import { Role } from "@shelf/shared";

const TENANT_SCOPED_MODELS = new Set([
  "product",
  "category",
  "cart",
  "order",
  "user",
]);

export function createScopedPrisma(tenantId: string, userRole: Role): PrismaClient {
  const prisma = new PrismaClient();

  if (userRole === Role.super_admin) return prisma;

  // Apply tenant filter via middleware
  prisma.$use(async (params, next) => {
    const model = params.model?.toLowerCase();

    if (model && TENANT_SCOPED_MODELS.has(model)) {
      // Only add tenant filter for read operations
      if (params.action === "findUnique" || params.action === "findFirst" || params.action === "findMany") {
        params.args = {
          ...params.args,
          where: {
            ...params.args?.where,
            tenantId,
          },
        };
      }

      // For create operations
      if (params.action === "create") {
        params.args = {
          ...params.args,
          data: {
            ...params.args?.data,
            tenantId,
          },
        };
      }
    }

    return next(params);
  });

  return prisma;
}
