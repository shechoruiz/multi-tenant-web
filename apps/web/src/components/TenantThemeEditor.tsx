import { useEffect, useState } from "react";
import type { TenantThemeDTO, UpdateThemeDTO } from "@shelf/shared";
import { ImagePlus, Trash2, Eye, EyeOff, Save } from "lucide-react";
import { api } from "../lib/api";
import { buttonVariants } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface UploadResponse {
  thumbnail: string;
  medium: string;
  full: string;
  originalName: string;
  size: number;
}

interface TenantThemeEditorProps {
  tenantSlug: string;
}

const FONT_OPTIONS = ["Inter", "Geist", "Roboto", "Lato", "Poppins", "Montserrat"];

const DEFAULT_COLORS = {
  primary: "#18181b",
  secondary: "#f4f4f5",
  accent: "#f4f4f5",
};

function normalizeHex(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : DEFAULT_COLORS.primary;
}

function getContrastText(hex: string): string {
  const color = normalizeHex(hex);
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "#18181b" : "#ffffff";
}

export function TenantThemeEditor({ tenantSlug }: TenantThemeEditorProps) {
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [fontFamily, setFontFamily] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [faviconUrl, setFaviconUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<"logo" | "favicon" | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const data = await api<Partial<TenantThemeDTO>>(`/${tenantSlug}/admin/theme`);
        if (cancelled) return;
        setColors({
          primary: data.primaryColor ?? DEFAULT_COLORS.primary,
          secondary: data.secondaryColor ?? DEFAULT_COLORS.secondary,
          accent: data.accentColor ?? DEFAULT_COLORS.accent,
        });
        setFontFamily(data.fontFamily ?? "");
        setLogoUrl(data.logoUrl ?? "");
        setFaviconUrl(data.faviconUrl ?? "");
      } catch {
        // El backend devuelve el tema existente o vacío; sin tema no hay error fatal
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  function updateColor(key: keyof typeof colors, value: string) {
    setColors((prev) => ({ ...prev, [key]: normalizeHex(value) }));
    setError(null);
    setSuccess(null);
  }

  async function uploadFile(field: "logo" | "favicon") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/svg+xml";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setIsUploading(field);
      setError(null);
      setSuccess(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        const data = await api<UploadResponse>("/api/assets/upload", {
          method: "POST",
          body: formData,
        });
        const url = data.medium || data.full;
        if (field === "logo") setLogoUrl(url);
        else setFaviconUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir la imagen");
      } finally {
        setIsUploading(null);
      }
    };
    input.click();
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload: UpdateThemeDTO = {
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      accentColor: colors.accent,
      fontFamily: fontFamily || undefined,
      logoUrl: logoUrl || undefined,
      faviconUrl: faviconUrl || undefined,
    };

    try {
      await api(`/${tenantSlug}/admin/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSuccess("Tema guardado. Los cambios ya están visibles para la tienda.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el tema");
    } finally {
      setIsSaving(false);
    }
  }

  const fg = getContrastText(colors.secondary);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Colores</CardTitle>
            <CardDescription>Colores principales de la tienda en formato HEX</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(Object.keys(colors) as Array<keyof typeof colors>).map((key) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium capitalize">{key}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                    aria-label={`Color ${key}`}
                  />
                  <Input
                    value={colors[key]}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="w-28 font-mono text-xs"
                    aria-label={`Valor hexadecimal ${key}`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo y favicon</CardTitle>
            <CardDescription>Imágenes PNG, JPEG, WebP o SVG</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo de la tienda" className="h-10 w-10 rounded-md border border-border object-contain" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                  <ImagePlus className="size-4" />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => uploadFile("logo")}
                  disabled={isUploading === "logo"}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {isUploading === "logo" ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="inline-flex items-center gap-1 text-xs text-destructive"
                  >
                    <Trash2 className="size-3" />
                    Quitar logo
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {faviconUrl ? (
                <img src={faviconUrl} alt="Favicon de la tienda" className="h-10 w-10 rounded-md border border-border object-contain" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                  <ImagePlus className="size-4" />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => uploadFile("favicon")}
                  disabled={isUploading === "favicon"}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {isUploading === "favicon" ? "Subiendo..." : faviconUrl ? "Cambiar favicon" : "Subir favicon"}
                </button>
                {faviconUrl && (
                  <button
                    type="button"
                    onClick={() => setFaviconUrl("")}
                    className="inline-flex items-center gap-1 text-xs text-destructive"
                  >
                    <Trash2 className="size-3" />
                    Quitar favicon
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipografía</CardTitle>
            <CardDescription>Fuente principal de la tienda</CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={fontFamily}
              onChange={(e) => {
                setFontFamily(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">Predeterminada</option>
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className={buttonVariants({ variant: "default" })}
          >
            <Save />
            {isSaving ? "Guardando..." : "Guardar tema"}
          </button>
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className={buttonVariants({ variant: showPreview ? "secondary" : "outline" })}
          >
            {showPreview ? <EyeOff /> : <Eye />}
            {showPreview ? "Ocultar vista previa" : "Vista previa"}
          </button>
        </div>
      </div>

      {/* Live preview */}
      {showPreview && (
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>Así se verá la tienda con la configuración actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="overflow-hidden rounded-lg border border-border"
              style={{ backgroundColor: colors.secondary, color: fg, fontFamily }}
            >
              {/* Mock header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: colors.primary, color: getContrastText(colors.primary) }}>
                <div className="flex items-center gap-2">
                  {logoUrl && <img src={logoUrl} alt="Logo" className="h-6 w-6 rounded object-contain" style={{ backgroundColor: "#ffffff" }} />}
                  <span className="text-sm font-bold">Mi Tienda</span>
                </div>
                <div className="flex items-center gap-3 text-xs opacity-80">
                  <span>Productos</span>
                  <span>Carrito</span>
                  <span>Iniciar sesión</span>
                </div>
              </div>

              {/* Mock hero */}
              <div className="px-4 py-6">
                <h3 className="text-lg font-bold">Bienvenido a la tienda</h3>
                <p className="mt-1 text-xs opacity-70">Una tienda con la identidad visual de su marca.</p>
                <button
                  type="button"
                  className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{ backgroundColor: colors.primary, color: getContrastText(colors.primary) }}
                >
                  Explorar productos
                </button>
              </div>

              {/* Mock product cards */}
              <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-md p-2" style={{ backgroundColor: colors.accent, color: getContrastText(colors.accent) }}>
                    <div className="h-10 rounded bg-black/10" />
                    <p className="mt-1.5 text-[10px] font-medium">Producto {i + 1}</p>
                    <p className="text-[10px] opacity-60">$19.99</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
