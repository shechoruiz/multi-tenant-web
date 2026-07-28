// ── Image sizes ────────────────────────────────────────────────────────────────

export type ImageSizeName = "thumb" | "medium" | "full";

export interface ImageSizes {
  thumb: string; // URL (150px)
  medium: string; // URL (600px)
  full: string; // URL (1920px)
}

// ── Asset store interface ──────────────────────────────────────────────────────

export interface AssetStore {
  put(filename: string, buffer: Buffer, contentType: string): Promise<string>;
  get(url: string): Promise<Buffer>;
  delete(url: string): Promise<void>;
}

export interface UploadResult {
  sizes: ImageSizes;
  original: string;
  contentType: string;
}
