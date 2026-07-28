import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { requireRole } from "../middleware/require-role.js";
import { Role } from "@shelf/shared";
import { put } from "../lib/asset-store.js";
import { processImage, isMimeTypeSupported, isValidFileSize } from "../lib/image-processor.js";

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/assets/upload — upload an image
  app.post("/api/assets/upload", { preHandler: [requireRole(Role.admin)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: "No file provided" });
    }

    if (!isMimeTypeSupported(file.mimetype)) {
      return reply.status(400).send({
        error: `Unsupported format: ${file.mimetype}. Supported: PNG, JPEG, WebP`,
      });
    }

    const buffer = await file.toBuffer();

    if (!isValidFileSize(buffer.length)) {
      return reply.status(400).send({ error: "File too large. Maximum 10MB" });
    }

    const ext = file.filename ? file.filename.split(".").pop() : "jpg";
    const extension = ext ? `.${ext}` : ".jpg";

    // Process and store all three sizes
    const processed = await processImage(buffer, file.mimetype);

    const thumbnail = await put(processed.thumbnail, `-thumb${extension}`, file.mimetype);
    const medium = await put(processed.medium, `-medium${extension}`, file.mimetype);
    const full = await put(processed.full, `-full${extension}`, file.mimetype);

    return reply.status(201).send({
      thumbnail: thumbnail.url,
      medium: medium.url,
      full: full.url,
      originalName: file.filename,
      size: buffer.length,
    });
  });
}
