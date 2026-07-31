import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { TenantLayout } from "../components/TenantLayout";
import { AdminLayout } from "../components/AdminLayout";
import { LoginPage } from "../pages/public/LoginPage";
import { TenantsIndexPage } from "../pages/admin/tenants";
import { TenantDetailPage } from "../pages/admin/tenants/[id]";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:tenantSlug" element={<TenantLayout />}>
          {/* Public routes */}
          <Route index element={<div className="p-8 text-center"><p className="text-muted-foreground">Tienda</p></div>} />
          <Route path="products" element={<div className="p-8 text-center"><p className="text-muted-foreground">Productos</p></div>} />
          <Route path="products/:id" element={<div className="p-8 text-center"><p className="text-muted-foreground">Detalle producto</p></div>} />
          <Route path="categories" element={<div className="p-8 text-center"><p className="text-muted-foreground">Categorías</p></div>} />
          <Route path="cart" element={<div className="p-8 text-center"><p className="text-muted-foreground">Carrito</p></div>} />
          <Route path="login" element={<LoginPage />} />

          {/* Admin routes (protected by auth guard) */}
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<div className="p-8 text-center"><p className="text-muted-foreground">Bienvenido al panel de administración</p></div>} />
            <Route path="products" element={<div className="p-8 text-center"><p className="text-muted-foreground">Admin Productos</p></div>} />
            <Route path="categories" element={<div className="p-8 text-center"><p className="text-muted-foreground">Admin Categorías</p></div>} />
            <Route path="theme" element={<div className="p-8 text-center"><p className="text-muted-foreground">Admin Tema</p></div>} />
            <Route path="orders" element={<div className="p-8 text-center"><p className="text-muted-foreground">Admin Órdenes</p></div>} />
            <Route path="tenants" element={<TenantsIndexPage />} />
            <Route path="tenants/:id" element={<TenantDetailPage />} />
          </Route>
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/tienda-demo" replace />} />
        <Route path="*" element={<div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">404 — Página no encontrada</p></div>} />
      </Routes>
    </BrowserRouter>
  );
}
