import { useEffect } from "react";
import { useCartStore } from "../stores/cart";
import { useAuthStore } from "../stores/auth";

export function useCart(tenantSlug: string | undefined) {
  const { loadCart, mergeAnonymous, items, total, itemCount, isLoading, isAnonymous } =
    useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!tenantSlug) return;

    loadCart(tenantSlug, isAuthenticated);

    // Merge anonymous cart on login
    if (isAuthenticated) {
      mergeAnonymous(tenantSlug);
    }
  }, [tenantSlug, isAuthenticated, loadCart, mergeAnonymous]);

  return { items, total, itemCount, isLoading, isAnonymous, store: useCartStore };
}
