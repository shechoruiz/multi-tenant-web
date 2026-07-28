import { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { Role, hasMinRole } from "@shelf/shared";
import { verify, type JwtPayload } from "../lib/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

const PUBLIC_ROUTES = new Set([
  "POST /auth/login",
  "POST /auth/refresh",
  "POST /auth/forgot-password",
  "POST /auth/reset-password",
  "GET /health",
]);

function routeKey(method: string, url: string): string {
  const path = url.split("?")[0];
  return `${method} ${path}`;
}

function isPublicRoute(request: FastifyRequest): boolean {
  return PUBLIC_ROUTES.has(routeKey(request.method, request.url));
}

export function requireRole(minRole: Role) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (isPublicRoute(request)) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw { statusCode: 401, message: "Missing or invalid authorization header" };
    }

    const token = authHeader.slice(7);
    let payload: JwtPayload;

    try {
      payload = verify(token);
    } catch {
      throw { statusCode: 401, message: "Invalid or expired token" };
    }

    request.user = payload;

    if (!hasMinRole(payload.role, minRole)) {
      throw {
        statusCode: 403,
        message: "Insufficient permissions",
      };
    }
  };
}

export async function registerRoleGuard(app: FastifyInstance, minRole: Role): Promise<void> {
  app.addHook("onRequest", requireRole(minRole));
}
