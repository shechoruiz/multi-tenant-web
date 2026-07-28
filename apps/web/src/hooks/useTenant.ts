import { useState, useEffect } from "react";
import type { TenantDTO } from "@shelf/shared";
import { api } from "../lib/api";

interface UseTenantResult {
  tenant: TenantDTO | null;
  tenantSlug: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useTenant(slug: string | undefined): UseTenantResult {
  const [tenant, setTenant] = useState<TenantDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        // Try admin endpoint first, fall back to public
        const data = await api<TenantDTO>(`/api/tenants/slug/${slug}`).catch(() => null);

        if (cancelled) return;

        if (data) {
          setTenant(data);
        } else {
          // Public info — at least resolve slug exists
          setTenant({ slug } as TenantDTO);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tenant");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { tenant, tenantSlug: slug ?? null, isLoading, error };
}
