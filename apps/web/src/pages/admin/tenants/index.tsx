import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import type { TenantDTO } from "@shelf/shared";
import { Role } from "@shelf/shared";
import { Eye } from "lucide-react";
import { api } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth";
import { buttonVariants } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { cn } from "../../../lib/utils";

export function TenantsIndexPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { user } = useAuthStore();
  const [tenants, setTenants] = useState<TenantDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api<TenantDTO[]>("/api/tenants");
        if (!cancelled) setTenants(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar los tenants");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (user?.role !== Role.super_admin) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No tiene permisos para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <CardHeader className="px-0">
        <CardTitle>Tenants</CardTitle>
        <CardDescription>Lista de todas las tiendas registradas en la plataforma</CardDescription>
      </CardHeader>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando tenants...</div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No hay tenants registrados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Creado</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{tenant.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{tenant.slug}</td>
                      <td className="px-4 py-3 text-muted-foreground">{tenant.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            tenant.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {tenant.status === "active" ? "Activo" : "Suspendido"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(tenant.createdAt).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/${tenantSlug}/admin/tenants/${tenant.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Eye />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
