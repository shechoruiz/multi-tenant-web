import { create } from "zustand";
import { api } from "../lib/api";
import {
  getLocalCart,
  clearLocalCart,
  addToLocalCart,
  updateLocalCartItem,
  removeFromLocalCart,
  type LocalCartItem,
} from "../lib/cart-local";

export interface CartItemDisplay {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

interface PublicProductDetail {
  id: string;
  name: string;
  price: number;
  images: Array<{ url: string; altText: string | null; sortOrder: number }>;
}

/** Resuelve el display de los items anónimos contra el catálogo público (precio actual). */
async function resolveAnonymousItems(
  tenantSlug: string,
  localItems: LocalCartItem[],
): Promise<CartItemDisplay[]> {
  const resolved = await Promise.allSettled(
    localItems.map(async (item): Promise<CartItemDisplay> => {
      const product = await api<PublicProductDetail>(`/${tenantSlug}/products/${item.productId}`, {
        skipAuth: true,
      });
      return {
        id: item.productId,
        productId: item.productId,
        productName: product.name,
        productImage: product.images[0]?.url ?? null,
        price: Number(product.price),
        quantity: item.quantity,
        subtotal: Number(product.price) * item.quantity,
      };
    }),
  );

  return resolved
    .filter((r): r is PromiseFulfilledResult<CartItemDisplay> => r.status === "fulfilled")
    .map((r) => r.value);
}

export interface CartState {
  items: CartItemDisplay[];
  total: number;
  itemCount: number;
  isLoading: boolean;
  isAnonymous: boolean;
  loadCart: (tenantSlug: string, isAuthenticated: boolean) => Promise<void>;
  addItem: (tenantSlug: string, productId: string, quantity: number) => Promise<void>;
  updateItem: (tenantSlug: string, itemId: string, quantity: number) => Promise<void>;
  removeItem: (tenantSlug: string, itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  mergeAnonymous: (tenantSlug: string) => Promise<void>;
  refreshAnonymous: (tenantSlug: string) => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  itemCount: 0,
  isLoading: false,
  isAnonymous: true,

  loadCart: async (tenantSlug: string, isAuthenticated: boolean) => {
    set({ isLoading: true });

    if (!isAuthenticated) {
      const local = getLocalCart(tenantSlug);
      const items = await resolveAnonymousItems(tenantSlug, local);
      set({
        isLoading: false,
        isAnonymous: true,
        items,
        total: items.reduce((sum, i) => sum + i.subtotal, 0),
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      });
      return;
    }

    try {
      const data = await api<{
        items: CartItemDisplay[];
        total: number;
      }>(`/${tenantSlug}/cart`);

      set({
        items: data.items,
        total: data.total,
        itemCount: data.items.reduce((sum, i) => sum + i.quantity, 0),
        isLoading: false,
        isAnonymous: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (tenantSlug, productId, quantity) => {
    const { isAnonymous } = get();

    if (isAnonymous) {
      addToLocalCart(tenantSlug, productId, quantity);
      await get().refreshAnonymous(tenantSlug);
      return;
    }

    await api(`/${tenantSlug}/cart/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });

    // Reload cart
    await get().loadCart(tenantSlug, true);
  },

  updateItem: async (tenantSlug, itemId, quantity) => {
    const { isAnonymous } = get();

    if (isAnonymous) {
      updateLocalCartItem(tenantSlug, itemId, quantity);
      await get().refreshAnonymous(tenantSlug);
      return;
    }

    await api(`/${tenantSlug}/cart/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });

    await get().loadCart(tenantSlug, true);
  },

  removeItem: async (tenantSlug, itemId) => {
    const { isAnonymous } = get();

    if (isAnonymous) {
      removeFromLocalCart(tenantSlug, itemId);
      await get().refreshAnonymous(tenantSlug);
      return;
    }

    await api(`/${tenantSlug}/cart/items/${itemId}`, { method: "DELETE" });
    await get().loadCart(tenantSlug, true);
  },

  clearCart: async () => {
    clearLocalCart();
    set({ items: [], total: 0, itemCount: 0 });
  },

  refreshAnonymous: async (tenantSlug: string) => {
    const items = await resolveAnonymousItems(tenantSlug, getLocalCart(tenantSlug));
    set({
      items,
      total: items.reduce((sum, i) => sum + i.subtotal, 0),
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    });
  },

  mergeAnonymous: async (tenantSlug: string) => {
    const local = getLocalCart(tenantSlug);
    if (local.length === 0) return;

    try {
      await api(`/${tenantSlug}/cart/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: local.map((i: LocalCartItem) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      clearLocalCart();
      await get().loadCart(tenantSlug, true);
    } catch {
      // Merge failed; keep local cart
    }
  },
}));
