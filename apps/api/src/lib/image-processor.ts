// Image processor — wraps Sharp for resize and format validation
// Falls back to no-op when Sharp is not installed

const SUPPORTED_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface ProcessedImage {
  thumbnail: Buffer;
  medium: Buffer;
  full: Buffer;
  format: string;
}

let sharpAvailable: boolean | null = null;

async function isSharpAvailable(): Promise<boolean> {
  if (sharpAvailable !== null) return sharpAvailable;
  try {
    await import("sharp");
    sharpAvailable = true;
  } catch {
    sharpAvailable = false;
  }
  return sharpAvailable;
}

export function isMimeTypeSupported(mime: string): boolean {
  return SUPPORTED_MIMES.has(mime);
}

export function isValidFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

export async function processImage(buffer: Buffer, mimeType: string): Promise<ProcessedImage> {
  if (!isMimeTypeSupported(mimeType)) {
    throw new Error(`Unsupported image format: ${mimeType}`);
  }

  const available = await isSharpAvailable();

  if (!available) {
    return {
      thumbnail: buffer,
      medium: buffer,
      full: buffer,
      format: mimeType,
    };
  }

  // Dynamic import — Sharp may not be installed in all environments
  const sharpMod: any = await import("sharp");
  const sharp = sharpMod.default ?? sharpMod;

  const format = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpeg";

  const [thumbnail, medium, full] = await Promise.all([
    sharp(buffer).resize(150, 150, { fit: "cover" })[format]({ quality: 80 }).toBuffer(),
    sharp(buffer).resize(600, 600, { fit: "inside" })[format]({ quality: 85 }).toBuffer(),
    sharp(buffer).resize(1920, 1920, { fit: "inside" })[format]({ quality: 90 }).toBuffer(),
  ]);

  return { thumbnail, medium, full, format: mimeType };
}
