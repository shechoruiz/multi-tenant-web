import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import type { TenantDTO } from "@shelf/shared";
import { Role } from "@shelf/shared";
import { Palette } from "lucide-react";
import { api } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth";
import { buttonVariants } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { cn } from "../../../lib/utils";

interface TenantUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

interface TenantWithUsers extends TenantDTO {
  users?: TenantUser[];
}

interface FormState {
  name: string;
  slug: string;
  email: string;
  status: "active" | "suspended";
  isActive: boolean;
}

export function TenantDetailPage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const { user } = useAuthStore();
  const [tenant, setTenant] = useState<TenantWithUsers | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api<TenantWithUsers>(`/api/tenants/${id}`);
        if (cancelled) return;
        setTenant(data);
        setForm({
          name: data.name,
          slug: data.slug,
          email: data.email,
          status: data.status,
          isActive: data.isActive,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar el tenant");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (user?.role !== Role.super_admin) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No tiene permisos para acceder a esta sección.</p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !id) return;

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const updated = await api<TenantDTO>(`/api/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setTenant((prev) => (prev ? { ...prev, ...updated } : prev));
      setSuccess("Cambios guardados correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse text-muted-foreground">Cargando tenant...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Tenant no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <CardHeader className="px-0">
        <CardTitle>{tenant.name}</CardTitle>
        <CardDescription>
          Detalle y configuración de la tienda. El slug identifica al tenant en la URL.
        </CardDescription>
      </CardHeader>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {success && <p className="mb-4 text-sm text-emerald-600">{success}</p>}

      <Card className="mb-6">
        <CardContent className="px-5 pt-1">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="name"
                value={form?.name ?? ""}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug
              </label>
              <Input
                id="slug"
                value={form?.slug ?? ""}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, slug: e.target.value } : prev))}
                required
              />
              <p className="text-xs text-muted-foreground">Identificador único usado en la URL de la tienda.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email de contacto
              </label>
              <Input
                id="email"
                type="email"
                value={form?.email ?? ""}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="status" className="text-sm font-medium">
                Estado
              </label>
              <select
                id="status"
                value={form?.status ?? "active"}
                onChange={(e) =>
                  setForm((prev) =>
                    prev ? { ...prev, status: e.target.value as FormState["status"] } : prev
                  )
                }
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form?.isActive ?? true}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, isActive: e.target.checked } : prev))}
                className="size-4 accent-primary"
              />
              Tienda activa (permite login y acceso público)
            </label>

            <div className="mt-1 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className={buttonVariants({ variant: "default" })}
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
              <Link
                to={`/${tenantSlug}/admin/tenants/${tenant.id}/theme`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Palette />
                Editar tema
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {tenant.users && tenant.users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>Usuarios registrados en este tenant</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pt-1">
            <ul className="divide-y divide-border text-sm">
              {tenant.users.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="font-medium">{u.name ?? u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      u.role === Role.super_admin
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {u.role === Role.super_admin ? "Super admin" : u.role === Role.admin ? "Admin" : u.role === Role.staff ? "Staff" : "Cliente"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
