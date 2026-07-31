import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ProductCard, type PublicProductCard } from "../../components/ProductCard";
import { api } from "../../lib/api";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
}

function findCategoryBySlug(nodes: CategoryNode[], slug: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const found = findCategoryBySlug(node.children ?? [], slug);
    if (found) return found;
  }
  return null;
}

export function CategoryPage() {
  const { tenantSlug, slug } = useParams<{ tenantSlug: string; slug: string }>();
  const [category, setCategory] = useState<CategoryNode | null>(null);
  const [products, setProducts] = useState<PublicProductCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantSlug || !slug) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setNotFound(false);
      setError(null);

      try {
        const tree = await api<CategoryNode[]>(`/${tenantSlug}/categories`, {
          skipAuth: true,
        });

        if (cancelled) return;

        const match = findCategoryBySlug(tree, slug);
        if (!match) {
          setNotFound(true);
          setCategory(null);
          setProducts([]);
          return;
        }

        setCategory(match);

        // Productos de esta categoría (el backend filtra por categoryId exacto)
        const categoryProducts = await api<PublicProductCard[]>(
          `/${tenantSlug}/products?categoryId=${encodeURIComponent(match.id)}`,
          { skipAuth: true },
        );
        if (cancelled) return;
        setProducts(categoryProducts);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error al cargar la categoría");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [tenantSlug, slug]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando categoría...</div>
      </div>
    );
  }

  if (notFound || !category) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-medium">Categoría no encontrada</p>
        <p className="text-sm text-muted-foreground">
          La categoría que buscas no existe o no tiene productos publicados.
        </p>
        <Link to={`/${tenantSlug}/products`} className="text-sm text-primary hover:underline">
          Ver todos los productos
        </Link>
      </div>
    );
  }

  const subcategories = category.children ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to={`/${tenantSlug}`} className="hover:text-foreground transition-colors">
          Inicio
        </Link>
        {" / "}
        <Link to={`/${tenantSlug}/products`} className="hover:text-foreground transition-colors">
          Productos
        </Link>
        <span className="text-foreground"> / {category.name}</span>
      </nav>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
        {subcategories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <Link
                key={sub.id}
                to={`/${tenantSlug}/category/${sub.slug}`}
                className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No hay productos en esta categoría por el momento.</p>
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
