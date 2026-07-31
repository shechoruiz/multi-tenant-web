import { useEffect, useState } from "react";
import { useParams } from "react-router";
import type { TenantDTO } from "@shelf/shared";
import { Role } from "@shelf/shared";
import { api } from "../../../../lib/api";
import { useAuthStore } from "../../../../stores/auth";
import { TenantThemeEditor } from "../../../../components/TenantThemeEditor";
import { CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";

export function TenantThemePage() {
  const { id } = useParams<{ tenantSlug: string; id: string }>();
  const { user } = useAuthStore();
  const [tenant, setTenant] = useState<TenantDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api<TenantDTO>(`/api/tenants/${id}`);
        if (!cancelled) setTenant(data);
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

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse text-muted-foreground">Cargando tema...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{error ?? "Tenant no encontrado."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <CardHeader className="px-0">
        <CardTitle>Tema de {tenant.name}</CardTitle>
        <CardDescription>
          Personalice colores, logo y tipografía de la tienda. Los cambios se aplican al guardar.
        </CardDescription>
      </CardHeader>
      <TenantThemeEditor tenantSlug={tenant.slug} />
    </div>
  );
}
