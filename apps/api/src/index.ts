import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { authRoutes } from "./plugins/auth.js";
import { tenantRoutes } from "./plugins/tenants.js";
import { assetRoutes } from "./plugins/assets.js";
import { catalogRoutes } from "./plugins/catalog.js";
import { adminCatalogRoutes } from "./plugins/admin-catalog.js";
import { cartRoutes } from "./plugins/cart.js";
import { cartMergeRoutes } from "./plugins/cart-merge.js";
import { orderRoutes } from "./plugins/orders.js";
import { resolveTenant } from "./middleware/resolve-tenant.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  const app = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    },
  });

  // Plugins
  await app.register(cors, {
    origin: ["http://localhost:5173"],
    credentials: true,
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  // Global hooks
  app.addHook("onRequest", resolveTenant);

  // Health check
  app.get("/health", async (_request, _reply) => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Route plugins
  await app.register(authRoutes);
  await app.register(tenantRoutes);
  await app.register(assetRoutes);
  await app.register(catalogRoutes);
  await app.register(adminCatalogRoutes);
  await app.register(cartRoutes);
  await app.register(cartMergeRoutes);
  await app.register(orderRoutes);

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
