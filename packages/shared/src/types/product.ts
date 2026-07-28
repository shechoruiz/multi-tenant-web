// ── Enums ──────────────────────────────────────────────────────────────────────

export enum ProductStatus {
  active = "active",
  inactive = "inactive",
}

// ── DTOs ───────────────────────────────────────────────────────────────────────

export interface ProductDTO {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sku: string;
  stock: number;
  status: ProductStatus;
  categoryId: string | null;
  tenantId: string;
  images: ProductImageDTO[];
  createdAt: string;
  updatedAt: string;
}

/** Public product view — omits stock, sku, and status for non-admin responses */
export interface PublicProductDTO {
  id: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string | null;
  images: ProductImageDTO[];
  createdAt: string;
}

export interface CreateProductDTO {
  name: string;
  description?: string;
  price: number;
  sku: string;
  stock?: number;
  status?: ProductStatus;
  categoryId?: string;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  price?: number;
  sku?: string;
  stock?: number;
  status?: ProductStatus;
  categoryId?: string | null;
}

export interface ProductFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string; // ILIKE search over name, sku, description
  status?: ProductStatus; // admin only
  page?: number;
  limit?: number;
  cursor?: string; // public cursor-based pagination
}

// ── Image ──────────────────────────────────────────────────────────────────────

export interface ProductImageDTO {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
}
