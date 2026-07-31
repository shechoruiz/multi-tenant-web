import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CheckCircle2, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useAuthStore } from "../../stores/auth";
import { api } from "../../lib/api";
import { Button, buttonVariants } from "../../components/ui/button";
import type { OrderDTO } from "@shelf/shared";

function formatPrice(value: number): string {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : "—";
}

export function CartPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { items, total, itemCount, isLoading, store } = useCart(tenantSlug);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [checkingOut, setCheckingOut] = useState(false);
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Forzar recarga del carrito al entrar (especialmente tras login con merge)
  useEffect(() => {
    if (!tenantSlug) return;
    store.getState().loadCart(tenantSlug, isAuthenticated);
  }, [tenantSlug, isAuthenticated, store]);

  async function handleUpdateQuantity(itemId: string, quantity: number) {
    if (!tenantSlug) return;
    setError(null);
    try {
      await store.getState().updateItem(tenantSlug, itemId, quantity);
    } catch {
      setError("No se pudo actualizar la cantidad");
    }
  }

  async function handleRemove(itemId: string) {
    if (!tenantSlug) return;
    setError(null);
    try {
      await store.getState().removeItem(tenantSlug, itemId);
    } catch {
      setError("No se pudo eliminar el artículo");
    }
  }

  async function handleCheckout() {
    if (!tenantSlug) return;

    if (!isAuthenticated) {
      // El checkout requiere sesión: ir a login y volver al carrito
      navigate(`/${tenantSlug}/login?redirect=/${tenantSlug}/cart`);
      return;
    }

    setCheckingOut(true);
    setError(null);

    try {
      const result = await api<OrderDTO>(`/${tenantSlug}/orders/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await store.getState().clearCart();
      setOrder(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el pedido");
    } finally {
      setCheckingOut(false);
    }
  }

  // Pantalla de confirmación tras checkout exitoso
  if (order) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <CheckCircle2 className="size-12 text-primary" />
        <h1 className="text-2xl font-bold">¡Pedido realizado!</h1>
        <p className="text-muted-foreground">
          Tu pedido <span className="font-medium text-foreground">{order.orderNumber}</span> fue
          registrado con éxito. Te contactaremos para coordinar la entrega.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link to={`/${tenantSlug}/products`} className={buttonVariants()}>
            Seguir comprando
          </Link>
          <Link
            to={`/${tenantSlug}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando carrito...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-medium">Tu carrito está vacío</p>
        <p className="text-sm text-muted-foreground">
          Explora los productos de la tienda y añade lo que te guste.
        </p>
        <Link to={`/${tenantSlug}/products`} className={buttonVariants()}>
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Tu carrito</h1>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Items */}
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              {item.productImage ? (
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="size-20 shrink-0 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="flex size-20 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground">
                  Sin imagen
                </div>
              )}

              <div className="min-w-0 flex-1">
                <Link
                  to={`/${tenantSlug}/products/${item.productId}`}
                  className="font-medium hover:underline line-clamp-1"
                >
                  {item.productName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(item.price)} c/u
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Disminuir cantidad"
                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Aumentar cantidad"
                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>

              <p className="w-20 text-right text-sm font-semibold">{formatPrice(item.subtotal)}</p>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Eliminar artículo"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(item.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>

        {/* Resumen */}
        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Resumen</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Artículos</span>
              <span>
                {itemCount} {itemCount === 1 ? "artículo" : "artículos"}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Envío</span>
              <span>Se calcula al confirmar</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <Button
            className="mt-5 w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={checkingOut}
          >
            {checkingOut ? "Procesando..." : "Finalizar compra"}
          </Button>
          {!isAuthenticated && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Deberás iniciar sesión para confirmar el pedido.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
