import { ShoppingCart } from "lucide-react";

interface StoreBadgeProps {
  count: number;
  onClick: () => void;
}

/** Botón del carrito en el header con contador de items. */
export function StoreBadge({ count, onClick }: StoreBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Abrir carrito de compras"
    >
      <ShoppingCart className="size-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  );
}
