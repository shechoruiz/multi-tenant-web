import { useState, useEffect } from "react";
import type { TenantThemeDTO } from "@shelf/shared";
import { api } from "../lib/api";
import { applyTheme, resetTheme } from "../lib/theme";

export function useTheme(slug: string | undefined) {
  const [theme, setTheme] = useState<TenantThemeDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      resetTheme();
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);

      try {
        const data = await api<TenantThemeDTO>(`/${slug}/theme`, {
          skipAuth: true,
        });

        if (cancelled) return;

        setTheme(data);
        applyTheme(data);
      } catch {
        if (!cancelled) {
          setTheme(null);
          resetTheme();
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

  return { theme, isLoading };
}
