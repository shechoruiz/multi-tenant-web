// ── DTOs ───────────────────────────────────────────────────────────────────────

export interface CartDTO {
  id: string;
  userId: string;
  tenantId: string;
  items: CartItemDTO[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItemDTO {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface AddCartItemDTO {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemDTO {
  quantity: number; // 0 removes the item
}

// ── Merge ──────────────────────────────────────────────────────────────────────

export interface MergeCartDTO {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface MergeCartResponse {
  cart: CartDTO;
  warnings: MergeWarning[];
}

export interface MergeWarning {
  type: "stock_adjusted" | "product_removed";
  productId: string;
  productName: string;
  message: string;
}

// ── Local storage (anonymous cart) ─────────────────────────────────────────────

export interface LocalCartItem {
  productId: string;
  quantity: number;
  addedAt: number; // timestamp for ordering
}

export interface LocalCartStore {
  items: LocalCartItem[];
  lastActivity: number; // Date.now() for expiry
  tenantSlug: string;
}
