const CART_STORAGE_KEY = "shelf-cart";
const CART_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface LocalCartItem {
  productId: string;
  quantity: number;
  addedAt: number;
}

export interface LocalCartStore {
  items: LocalCartItem[];
  lastActivity: number;
  tenantSlug: string;
}

export function getLocalCart(tenantSlug: string): LocalCartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const store: LocalCartStore = JSON.parse(raw);

    // Check tenant match
    if (store.tenantSlug !== tenantSlug) return [];

    // Check expiry
    if (Date.now() - store.lastActivity > CART_EXPIRY_MS) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }

    return store.items;
  } catch {
    return [];
  }
}

export function saveLocalCart(tenantSlug: string, items: LocalCartItem[]) {
  const store: LocalCartStore = {
    items,
    lastActivity: Date.now(),
    tenantSlug,
  };
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(store));
}

export function clearLocalCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
}

export function addToLocalCart(tenantSlug: string, productId: string, quantity: number) {
  const items = getLocalCart(tenantSlug);
  const existing = items.find((i) => i.productId === productId);

  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ productId, quantity, addedAt: Date.now() });
  }

  saveLocalCart(tenantSlug, items);
}

export function updateLocalCartItem(tenantSlug: string, productId: string, quantity: number) {
  const items = getLocalCart(tenantSlug);

  if (quantity === 0) {
    saveLocalCart(tenantSlug, items.filter((i) => i.productId !== productId));
    return;
  }

  const item = items.find((i) => i.productId === productId);
  if (item) {
    item.quantity = quantity;
  }
  saveLocalCart(tenantSlug, items);
}

export function removeFromLocalCart(tenantSlug: string, productId: string) {
  const items = getLocalCart(tenantSlug);
  saveLocalCart(tenantSlug, items.filter((i) => i.productId !== productId));
}
