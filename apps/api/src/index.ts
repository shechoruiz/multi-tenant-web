import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

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

  // Health check
  app.get("/health", async (_request, _reply) => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
