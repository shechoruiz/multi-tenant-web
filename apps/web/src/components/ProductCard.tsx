import { Link } from "react-router";

export interface PublicProductCard {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: Array<{ url: string; altText: string | null; sortOrder: number }>;
}

interface ProductCardProps {
  product: PublicProductCard;
  tenantSlug: string;
}

function formatPrice(value: number): string {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : "—";
}

export function ProductCard({ product, tenantSlug }: ProductCardProps) {
  const image = product.images[0];

  return (
    <Link
      to={`/${tenantSlug}/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-colors hover:border-foreground/30"
    >
      <div className="overflow-hidden bg-muted/20">
        {image ? (
          <img
            src={image.url}
            alt={image.altText ?? product.name}
            className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="font-medium leading-snug line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
        )}
        <p className="mt-1 font-semibold text-primary">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}
