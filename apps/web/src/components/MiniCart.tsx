import { Link } from "react-router";
import { useCart } from "../hooks/useCart";
import { buttonVariants } from "./ui/button";
import { cn } from "../lib/utils";

interface MiniCartProps {
  tenantSlug: string;
  onClose: () => void;
}

function formatPrice(value: number): string {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : "—";
}

/** Panel desplegable con el resumen del carrito (items, total y accesos). */
export function MiniCart({ tenantSlug, onClose }: MiniCartProps) {
  const { items, total, itemCount } = useCart(tenantSlug);

  if (items.length === 0) {
    return (
      <div className="absolute top-full right-0 z-50 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg">
        <p className="text-sm text-muted-foreground">Tu carrito está vacío</p>
        <Link
          to={`/${tenantSlug}/products`}
          onClick={onClose}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 w-full")}
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="absolute top-full right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">
          Carrito ({itemCount} {itemCount === 1 ? "artículo" : "artículos"})
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            {item.productImage ? (
              <img
                src={item.productImage}
                alt={item.productName}
                className="size-12 shrink-0 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground">
                Sin imagen
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.productName}</p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} × {formatPrice(item.price)}
              </p>
            </div>
            <p className="text-sm font-semibold">{formatPrice(item.subtotal)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <p className="text-sm font-medium">Total</p>
        <p className="text-sm font-semibold">{formatPrice(total)}</p>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <Link
          to={`/${tenantSlug}/cart`}
          onClick={onClose}
          className={cn(buttonVariants({ size: "sm" }), "w-full")}
        >
          Ver carrito
        </Link>
        <Link
          to={`/${tenantSlug}/cart`}
          onClick={onClose}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
        >
          Finalizar compra
        </Link>
      </div>
    </div>
  );
}
