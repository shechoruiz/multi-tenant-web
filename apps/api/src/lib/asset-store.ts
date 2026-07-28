import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

export interface UploadResult {
  url: string;
  fileName: string;
  size: number;
  mimeType: string;
}

export interface ImageSizes {
  thumbnail: string;
  medium: string;
  full: string;
}

export async function ensureUploadsDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

export async function put(
  buffer: Buffer,
  extension: string,
  mimeType: string,
): Promise<UploadResult> {
  await ensureUploadsDir();

  const fileName = `${crypto.randomUUID()}${extension}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  await fs.writeFile(filePath, buffer);
  const stat = await fs.stat(filePath);

  return {
    url: `/uploads/${fileName}`,
    fileName,
    size: stat.size,
    mimeType,
  };
}

export async function get(fileName: string): Promise<Buffer | null> {
  const filePath = path.join(UPLOADS_DIR, fileName);

  // Prevent directory traversal
  if (!filePath.startsWith(UPLOADS_DIR)) return null;

  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function remove(fileName: string): Promise<boolean> {
  const filePath = path.join(UPLOADS_DIR, fileName);

  if (!filePath.startsWith(UPLOADS_DIR)) return false;

  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
