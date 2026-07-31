import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import type { ProductStatus } from "@shelf/shared";
import { Plus, Search } from "lucide-react";
import { api } from "../../../lib/api";
import { buttonVariants } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { cn } from "../../../lib/utils";

interface AdminProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
}

interface AdminProduct {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  sku: string;
  stock: number;
  status: ProductStatus;
  categoryId: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  images: AdminProductImage[];
  category?: { id: string; name: string; slug: string } | null;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

function formatPrice(value: string | number): string {
  const num = Number(value);
  return Number.isFinite(num) ? `$${num.toFixed(2)}` : "—";
}

function getStatusLabel(status: ProductStatus): string {
  return status === "active" ? "Activo" : "Inactivo";
}

export function ProductsIndexPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Debounce de búsqueda: 400ms tras el último cambio
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const data = await api<CategoryOption[]>(`/${tenantSlug}/admin/categories`);
        if (!cancelled) setCategories(data);
      } catch {
        // El filtro de categoría se oculta si no se pueden cargar
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryId) params.set("categoryId", categoryId);
      if (status) params.set("status", status);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);

      const query = params.toString();
      const url = `/${tenantSlug}/admin/products${query ? `?${query}` : ""}`;

      try {
        const data = await api<AdminProduct[]>(url);
        if (!cancelled) setProducts(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar los productos");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, debouncedSearch, categoryId, status, minPrice, maxPrice]);

  const hasFilters = debouncedSearch || categoryId || status || minPrice || maxPrice;

  return (
    <div className="mx-auto max-w-6xl">
      <CardHeader className="px-0 pb-6">
        <CardTitle>Productos</CardTitle>
        <CardDescription>Catálogo de la tienda: stock, precios y estado de cada producto</CardDescription>
      </CardHeader>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {/* Barra de filtros */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU o descripción..."
              className="pl-9"
              aria-label="Buscar productos"
            />
          </div>

          {categories.length > 0 && (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:w-44"
              aria-label="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:w-32"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>

          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Precio mín."
              className="w-28"
              aria-label="Precio mínimo"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Precio máx."
              className="w-28"
              aria-label="Precio máximo"
            />
          </div>

          <Link to={`/${tenantSlug}/admin/products/nuevo`} className={buttonVariants({ variant: "default" })}>
            <Plus />
            Nuevo producto
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando productos...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {hasFilters
                ? "No hay productos que coincidan con los filtros aplicados."
                : "Aún no hay productos en esta tienda. Cree el primero con «Nuevo producto»."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 font-medium">Precio</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.images[0] ? (
                            <img
                              src={product.images[0].url}
                              alt={product.images[0].altText ?? product.name}
                              className="h-10 w-10 rounded-md border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                              —
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="max-w-64 truncate text-xs text-muted-foreground">{product.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{product.sku}</td>
                      <td className="px-4 py-3 text-muted-foreground">{product.category?.name ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{formatPrice(product.price)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(product.stock > 0 ? "text-foreground" : "text-destructive")}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            product.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {getStatusLabel(product.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/${tenantSlug}/admin/products/${product.id}`}
                          className={buttonVariants({ variant: "secondary", size: "sm" })}
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
