import { Link, Navigate, Outlet, useParams } from "react-router";
import { LayoutDashboard, Package, Tags, ShoppingCart, Palette, Building2, type LucideIcon } from "lucide-react";
import { hasMinRole, Role } from "@shelf/shared";
import { useAuthStore } from "../stores/auth";
import { cn } from "../lib/utils";

interface MenuItem {
  label: string;
  to: string;
  icon: LucideIcon;
  minRole: Role;
}

export function AdminLayout() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/${tenantSlug}/login`} replace />;
  }

  const role = user?.role ?? Role.staff;

  const menuItems: MenuItem[] = [
    { label: "Panel", to: `/${tenantSlug}/admin`, icon: LayoutDashboard, minRole: Role.staff },
    { label: "Productos", to: `/${tenantSlug}/admin/products`, icon: Package, minRole: Role.staff },
    { label: "Categorías", to: `/${tenantSlug}/admin/categories`, icon: Tags, minRole: Role.staff },
    { label: "Pedidos", to: `/${tenantSlug}/admin/orders`, icon: ShoppingCart, minRole: Role.staff },
    { label: "Tema", to: `/${tenantSlug}/admin/theme`, icon: Palette, minRole: Role.admin },
    { label: "Tenants", to: `/${tenantSlug}/admin/tenants`, icon: Building2, minRole: Role.super_admin },
  ];

  const visibleItems = menuItems.filter((item) => hasMinRole(role, item.minRole));

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-border bg-muted/30 md:block">
        <nav className="flex flex-col gap-1 p-3">
          {visibleItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
