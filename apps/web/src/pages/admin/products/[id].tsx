import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ProductStatus } from "@shelf/shared";
import { ArrowLeft, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { api } from "../../../lib/api";
import { buttonVariants } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";

interface AdminProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
}

interface AdminProduct {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  sku: string;
  stock: number;
  status: ProductStatus;
  categoryId: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  images: AdminProductImage[];
  category?: { id: string; name: string; slug: string } | null;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface UploadResponse {
  thumbnail: string;
  medium: string;
  full: string;
  originalName: string;
  size: number;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  sku: string;
  stock: string;
  status: ProductStatus;
  categoryId: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  sku: "",
  stock: "0",
  status: ProductStatus.active,
  categoryId: "",
};

function isCreateMode(id: string | undefined): boolean {
  return id === "nuevo";
}

export function ProductFormPage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const navigate = useNavigate();

  const createMode = isCreateMode(id);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existingImages, setExistingImages] = useState<AdminProductImage[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const data = await api<CategoryOption[]>(`/${tenantSlug}/admin/categories`);
        if (!cancelled) setCategories(data);
      } catch {
        // Las categorías son opcionales; el selector se oculta si falla la carga
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  useEffect(() => {
    if (createMode || !id) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api<AdminProduct>(`/${tenantSlug}/admin/products/${id}`);
        if (cancelled) return;
        setExistingImages(data.images ?? []);
        setForm({
          name: data.name,
          description: data.description ?? "",
          price: String(data.price),
          sku: data.sku,
          stock: String(data.stock),
          status: data.status,
          categoryId: data.categoryId ?? "",
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar el producto");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, id, createMode]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  }

  async function uploadImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setError(null);
      setSuccess(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        const data = await api<UploadResponse>("/api/assets/upload", {
          method: "POST",
          body: formData,
        });
        setNewImageUrl(data.medium || data.full);
        setSuccess("Imagen subida correctamente. Se asociará al producto al guardar.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir la imagen");
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!form.name.trim() || !form.sku.trim() || !Number.isFinite(price)) {
      setError("Nombre, SKU y precio son obligatorios.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price,
      sku: form.sku.trim(),
      stock: Number.isFinite(stock) ? stock : 0,
      status: form.status,
      categoryId: form.categoryId || undefined,
      images: [
        ...existingImages.map((img) => ({ url: img.url, altText: img.altText, sortOrder: img.sortOrder })),
        ...(newImageUrl
          ? [{ url: newImageUrl, altText: null, sortOrder: existingImages.length }]
          : []),
      ],
    };

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (createMode) {
        await api<AdminProduct>(`/${tenantSlug}/admin/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else if (id) {
        await api<AdminProduct>(`/${tenantSlug}/admin/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      navigate(`/${tenantSlug}/admin/products`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el producto");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse text-muted-foreground">Cargando producto...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to={`/${tenantSlug}/admin/products`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a productos
      </Link>

      <CardHeader className="px-0">
        <CardTitle>{createMode ? "Nuevo producto" : "Editar producto"}</CardTitle>
        <CardDescription>
          Complete la información del producto. El SKU debe ser único dentro de la tienda.
        </CardDescription>
      </CardHeader>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {success && <p className="mb-4 text-sm text-emerald-600">{success}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
            <CardDescription>Datos principales del producto</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 pt-1">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Ej.: Camisa de algodón"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-sm font-medium">
                Descripción
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Descripción breve del producto"
                rows={4}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sku" className="text-sm font-medium">
                  SKU
                </label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => setField("sku", e.target.value)}
                  placeholder="Ej.: CAM-001"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="price" className="text-sm font-medium">
                  Precio
                </label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="stock" className="text-sm font-medium">
                  Stock
                </label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) => setField("stock", e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="status" className="text-sm font-medium">
                  Estado
                </label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value as ProductStatus)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="categoryId" className="text-sm font-medium">
                Categoría
              </label>
              <select
                id="categoryId"
                value={form.categoryId}
                onChange={(e) => setField("categoryId", e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Sin categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Imágenes</CardTitle>
            <CardDescription>
              Suba una imagen en formato PNG, JPEG o WebP (máximo 10 MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 pt-1">
            {(existingImages.length > 0 || newImageUrl) && (
              <div className="flex flex-wrap gap-3">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative">
                    <img
                      src={img.url}
                      alt={img.altText ?? "Imagen del producto"}
                      className="h-20 w-20 rounded-md border border-border object-cover"
                    />
                  </div>
                ))}
                {newImageUrl && (
                  <div className="relative">
                    <img
                      src={newImageUrl}
                      alt="Imagen recién subida"
                      className="h-20 w-20 rounded-md border border-primary object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setNewImageUrl(null)}
                      className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-destructive text-white"
                      aria-label="Quitar imagen subida"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={uploadImage}
                disabled={isUploading}
                className={buttonVariants({ variant: "outline" })}
              >
                {isUploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                {isUploading ? "Subiendo..." : "Subir imagen"}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSaving} className={buttonVariants({ variant: "default" })}>
            {isSaving ? "Guardando..." : createMode ? "Crear producto" : "Guardar cambios"}
          </button>
          <Link to={`/${tenantSlug}/admin/products`} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
