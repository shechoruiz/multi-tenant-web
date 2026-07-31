import { useParams } from "react-router";
import { TenantThemeEditor } from "../../components/TenantThemeEditor";
import { CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

export function AdminThemePage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  return (
    <div className="mx-auto max-w-5xl">
      <CardHeader className="px-0 pb-6">
        <CardTitle>Configuración visual</CardTitle>
        <CardDescription>
          Personalice colores, logo y tipografía de la tienda. Los cambios se aplican al guardar.
        </CardDescription>
      </CardHeader>
      <TenantThemeEditor tenantSlug={tenantSlug ?? ""} />
    </div>
  );
}
