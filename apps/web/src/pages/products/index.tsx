import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ProductCard, type PublicProductCard } from "../../components/ProductCard";
import { api } from "../../lib/api";

export function PublicProductsIndexPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [products, setProducts] = useState<PublicProductCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros (se aplican al enviar el formulario)
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const load = useCallback(
    async (filters?: { search?: string; minPrice?: string; maxPrice?: string }) => {
      if (!tenantSlug) return;
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters?.search) params.set("search", filters.search);
        if (filters?.minPrice) params.set("minPrice", filters.minPrice);
        if (filters?.maxPrice) params.set("maxPrice", filters.maxPrice);
        const qs = params.toString();
        const data = await api<PublicProductCard[]>(
          `/${tenantSlug}/products${qs ? `?${qs}` : ""}`,
          { skipAuth: true },
        );
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar los productos");
      } finally {
        setIsLoading(false);
      }
    },
    [tenantSlug],
  );

  useEffect(() => {
    load();
  }, [load]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    load({ search, minPrice, maxPrice });
  }

  function handleReset() {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    load();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to={`/${tenantSlug}`} className="hover:text-foreground transition-colors">
          Inicio
        </Link>
        {" / "}
        <span className="text-foreground">Productos</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
        <p className="mt-1 text-muted-foreground">
          Todos los productos disponibles en la tienda.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex flex-col gap-1.5 sm:flex-1">
          <label htmlFor="search" className="text-sm font-medium">
            Buscar
          </label>
          <input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, descripción o SKU"
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="minPrice" className="text-sm font-medium">
            Precio mínimo
          </label>
          <input
            id="minPrice"
            type="number"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0"
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-32"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxPrice" className="text-sm font-medium">
            Precio máximo
          </label>
          <input
            id="maxPrice"
            type="number"
            min="0"
            step="0.01"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="999"
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-32"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Filtrar
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
        >
          Limpiar
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Cargando productos...</div>
        </div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No hay productos que coincidan con tu búsqueda.</p>
          <p className="mt-1 text-sm">Prueba con otros filtros o consulta más tarde.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} tenantSlug={tenantSlug!} />
          ))}
        </div>
      )}
    </div>
  );
}
