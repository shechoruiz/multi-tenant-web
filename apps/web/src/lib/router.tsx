import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { TenantLayout } from "../components/TenantLayout";
import { AdminLayout } from "../components/AdminLayout";
import { LoginPage } from "../pages/public/LoginPage";
import { TenantsIndexPage } from "../pages/admin/tenants";
import { TenantDetailPage } from "../pages/admin/tenants/[id]";
import { TenantThemePage } from "../pages/admin/tenants/[id]/theme";
import { AdminThemePage } from "../pages/admin/theme";
import { ProductsIndexPage } from "../pages/admin/products";
import { ProductFormPage } from "../pages/admin/products/[id]";
import { CategoriesIndexPage } from "../pages/admin/categories";
import { ProductDetailPage } from "../pages/products/[id]";
import { ProductsIndexPage as PublicProductsPage } from "../pages/products";
import { CategoryPage } from "../pages/category/[slug]";
import { CartPage } from "../pages/cart";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:tenantSlug" element={<TenantLayout />}>
          {/* Public routes */}
          <Route index element={<div className="p-8 text-center"><p className="text-muted-foreground">Tienda</p></div>} />
          <Route path="products" element={<PublicProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="categories" element={<div className="p-8 text-center"><p className="text-muted-foreground">Categorías</p></div>} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="login" element={<LoginPage />} />

          {/* Admin routes (protected by auth guard) */}
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<div className="p-8 text-center"><p className="text-muted-foreground">Bienvenido al panel de administración</p></div>} />
          <Route path="products" element={<ProductsIndexPage />} />
            <Route path="products/nuevo" element={<ProductFormPage />} />
            <Route path="products/:id" element={<ProductFormPage />} />
            <Route path="categories" element={<CategoriesIndexPage />} />
            <Route path="theme" element={<AdminThemePage />} />
            <Route path="orders" element={<div className="p-8 text-center"><p className="text-muted-foreground">Admin Órdenes</p></div>} />
            <Route path="tenants" element={<TenantsIndexPage />} />
            <Route path="tenants/:id" element={<TenantDetailPage />} />
            <Route path="tenants/:id/theme" element={<TenantThemePage />} />
          </Route>
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/tienda-demo" replace />} />
        <Route path="*" element={<div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">404 — Página no encontrada</p></div>} />
      </Routes>
    </BrowserRouter>
  );
}
