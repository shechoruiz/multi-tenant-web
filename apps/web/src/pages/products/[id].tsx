import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Check, ShoppingCart } from "lucide-react";
import { useCartStore } from "../../stores/cart";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: Array<{ url: string; altText: string | null; sortOrder: number }>;
  category: { id: string; name: string; slug: string } | null;
}

function formatPrice(value: number): string {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : "—";
}

export function ProductDetailPage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!tenantSlug || !id) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setNotFound(false);
      setError(null);
      setActiveImage(0);

      try {
        const data = await api<PublicProduct>(`/${tenantSlug}/products/${id}`, {
          skipAuth: true,
        });
        if (cancelled) return;
        setProduct(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message.includes("404")) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : "Error al cargar el producto");
        }
        setProduct(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [tenantSlug, id]);

  async function handleAddToCart() {
    if (!tenantSlug || !product) return;
    setAdding(true);
    try {
      await addItem(tenantSlug, product.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      setError("No se pudo añadir el producto al carrito");
    } finally {
      setAdding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando producto...</div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-medium">Producto no encontrado</p>
        <p className="text-sm text-muted-foreground">
          El producto que buscas no existe o ya no está disponible.
        </p>
        <Button asChild variant="outline">
          <Link to={`/${tenantSlug}/products`}>Ver productos</Link>
        </Button>
      </div>
    );
  }

  const images = product.images;

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
        {product.category && (
          <>
            {" / "}
            <Link
              to={`/${tenantSlug}/category/${product.category.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span className="text-foreground"> / {product.name}</span>
      </nav>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-8 md:grid-cols-2">
        {/* Gallery */}
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
            {images.length > 0 ? (
              <img
                src={images[activeImage]?.url}
                alt={images[activeImage]?.altText ?? product.name}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center text-muted-foreground">
                Sin imagen
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    "size-20 overflow-hidden rounded-lg border bg-muted/20 transition-colors",
                    index === activeImage
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-foreground/30",
                  )}
                  aria-label={`Ver imagen ${index + 1}`}
                >
                  <img
                    src={image.url}
                    alt={image.altText ?? `${product.name} ${index + 1}`}
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          {product.category && (
            <Link
              to={`/${tenantSlug}/category/${product.category.slug}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {product.category.name}
            </Link>
          )}

          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>

          <p className="text-3xl font-semibold text-primary">{formatPrice(product.price)}</p>

          {product.description && (
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button
              onClick={handleAddToCart}
              disabled={adding || added}
              size="lg"
              className="gap-2"
            >
              {added ? (
                <>
                  <Check className="size-4" />
                  Añadido al carrito
                </>
              ) : (
                <>
                  <ShoppingCart className="size-4" />
                  Añadir al carrito
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
