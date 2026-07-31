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
      // We need product details for display; for now store basic info
      set({
        isLoading: false,
        isAnonymous: true,
        itemCount: local.reduce((sum, i) => sum + i.quantity, 0),
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
      const items = getLocalCart(tenantSlug);
      set({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) });
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
      const items = getLocalCart(tenantSlug);
      set({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) });
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
      const items = getLocalCart(tenantSlug);
      set({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) });
      return;
    }

    await api(`/${tenantSlug}/cart/items/${itemId}`, { method: "DELETE" });
    await get().loadCart(tenantSlug, true);
  },

  clearCart: async () => {
    clearLocalCart();
    set({ items: [], total: 0, itemCount: 0 });
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
