import { Outlet, useParams, Link } from "react-router";
import { useTenant } from "../hooks/useTenant";
import { useTheme } from "../hooks/useTheme";
import { useAuthStore } from "../stores/auth";
import { useEffect } from "react";
import { getAccessToken } from "../lib/api";

export function TenantLayout() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenant, isLoading: tenantLoading } = useTenant(tenantSlug);
  const { isLoading: themeLoading } = useTheme(tenantSlug);
  const { isAuthenticated, isLoading: authLoading, refresh } = useAuthStore();

  // Try to refresh session on mount
  useEffect(() => {
    if (getAccessToken()) {
      refresh();
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  }, [refresh]);

  if (tenantLoading || themeLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!tenantSlug) {
    return <div className="flex min-h-screen items-center justify-center">404</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to={`/${tenantSlug}`} className="font-bold text-lg">
              {tenant?.name ?? tenantSlug}
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link to={`/${tenantSlug}/products`} className="text-muted-foreground hover:text-foreground transition-colors">
                Productos
              </Link>
              <Link to={`/${tenantSlug}/cart`} className="text-muted-foreground hover:text-foreground transition-colors">
                Carrito
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to={`/${tenantSlug}/admin`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin
              </Link>
            ) : (
              <Link
                to={`/${tenantSlug}/login`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
