import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ProductCard, type PublicProductCard } from "../../components/ProductCard";
import { api } from "../../lib/api";
import { useTenant } from "../../hooks/useTenant";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
}

export function HomePage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenant } = useTenant(tenantSlug);
  const [featured, setFeatured] = useState<PublicProductCard[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantSlug) return;
    setIsLoading(true);
    setError(null);
    try {
      const [products, categoryTree] = await Promise.all([
        api<PublicProductCard[]>(`/${tenantSlug}/products`, { skipAuth: true }),
        api<CategoryNode[]>(`/${tenantSlug}/categories`, { skipAuth: true }),
      ]);
      setFeatured(products.slice(0, 8));
      setCategories(categoryTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la tienda");
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:py-20">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {tenant?.name ?? tenantSlug}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Explora nuestro catálogo de productos y encuentra lo que buscas.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={`/${tenantSlug}/products`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Ver productos
            </Link>
          </div>
        </div>
      </section>

      {/* Categorías */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="text-xl font-semibold tracking-tight">Categorías</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/${tenantSlug}/category/${cat.slug}`}
                className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Productos destacados */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Productos destacados</h2>
          <Link
            to={`/${tenantSlug}/products`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver todos →
          </Link>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando tienda...</div>
          </div>
        ) : featured.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>Aún no hay productos publicados.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} tenantSlug={tenantSlug!} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
