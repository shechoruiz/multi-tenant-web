import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { useParams } from "react-router";
import { Folder, FolderPlus, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../../lib/api";
import { buttonVariants } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

interface CategoryForm {
  name: string;
  slug: string;
  parentId: string;
}

const EMPTY_FORM: CategoryForm = { name: "", slug: "", parentId: "" };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Devuelve true si mover `sourceId` bajo `newParentId` crearía un ciclo en la jerarquía. */
function wouldCreateCycle(categories: Category[], sourceId: string, newParentId: string | null): boolean {
  if (!newParentId || newParentId === sourceId) return newParentId === sourceId;

  const byId = new Map(categories.map((c) => [c.id, c]));
  let current: Category | undefined = byId.get(newParentId);

  while (current) {
    if (current.id === sourceId) return true;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return false;
}

/** Conjunto de ids de todos los descendientes de `id` (incluyéndolo a él). */
function collectBranchIds(categories: Category[], id: string): Set<string> {
  const byParent = new Map<string, Category[]>();
  for (const cat of categories) {
    if (cat.parentId) {
      const siblings = byParent.get(cat.parentId) ?? [];
      siblings.push(cat);
      byParent.set(cat.parentId, siblings);
    }
  }

  const result = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (result.has(current)) continue;
    result.add(current);
    for (const child of byParent.get(current) ?? []) {
      queue.push(child.id);
    }
  }
  return result;
}

export function CategoriesIndexPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Formulario de creación/edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Drag & drop para reasignar jerarquía
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api<Category[]>(`/${tenantSlug}/admin/categories`);
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las categorías");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  function startCreate(parentId: string = "") {
    setEditingId(null);
    setIsNew(true);
    setForm({ ...EMPTY_FORM, parentId });
    setError(null);
    setSuccess(null);
  }

  function startEdit(cat: Category) {
    setIsNew(false);
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, parentId: cat.parentId ?? "" });
    setError(null);
    setSuccess(null);
  }

  function cancelForm() {
    setEditingId(null);
    setIsNew(false);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Nombre y slug son obligatorios.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      parentId: form.parentId || undefined,
    };

    if (editingId && wouldCreateCycle(categories, editingId, form.parentId || null)) {
      setError("Una categoría no puede ser hija de sí misma ni de una de sus subcategorías.");
      return;
    }

    try {
      if (editingId) {
        await api<Category>(`/${tenantSlug}/admin/categories/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Categoría actualizada correctamente.");
      } else {
        await api<Category>(`/${tenantSlug}/admin/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Categoría creada correctamente.");
      }
      cancelForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la categoría");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    const confirmed = window.confirm(
      `¿Eliminar la categoría «${cat.name}»? Los productos asociados quedarán sin categoría.`
    );
    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    try {
      await api(`/${tenantSlug}/admin/categories/${cat.id}`, { method: "DELETE" });
      setSuccess("Categoría eliminada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la categoría");
    }
  }

  async function moveCategory(categoryId: string, newParentId: string | null) {
    if (categoryId === newParentId) return;

    if (wouldCreateCycle(categories, categoryId, newParentId)) {
      setError("No se puede mover una categoría dentro de su propia rama.");
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    setIsMoving(true);
    setError(null);
    setSuccess(null);

    try {
      await api<Category>(`/${tenantSlug}/admin/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: newParentId }),
      });
      setSuccess("Jerarquía de categorías actualizada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al mover la categoría");
    } finally {
      setIsMoving(false);
      setDraggingId(null);
      setDragOverId(null);
    }
  }

  function handleDragStart(e: DragEvent, cat: Category) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", cat.id);
    setDraggingId(cat.id);
  }

  function handleDragOver(e: DragEvent, catId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(catId);
  }

  function handleDrop(e: DragEvent, targetCatId: string | null) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId) return;
    moveCategory(sourceId, targetCatId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  function renderTree(nodes: CategoryTreeNode[], depth: number) {
    return nodes.map((node) => (
      <div key={node.id}>
        <div
          draggable={!isMoving}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDrop={(e) => handleDrop(e, node.id)}
          onDragEnd={handleDragEnd}
          className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
            dragOverId === node.id
              ? "border-primary bg-primary/5"
              : draggingId === node.id
                ? "border-primary/50 bg-muted opacity-60"
                : "border-border bg-background hover:bg-muted/50"
          }`}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground group-hover:text-foreground" />
          <Folder className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate font-medium">{node.name}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">/{node.slug}</span>

          {node.children.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {node.children.length}
            </span>
          )}

          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => startCreate(node.id)}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              aria-label={`Agregar subcategoría a ${node.name}`}
              title="Agregar subcategoría"
            >
              <Plus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => startEdit(node)}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              aria-label={`Editar ${node.name}`}
              title="Editar"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(node)}
              className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-destructive" })}
              aria-label={`Eliminar ${node.name}`}
              title="Eliminar"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {node.children.length > 0 && <div className="mt-1.5 flex flex-col gap-1.5">{renderTree(node.children, depth + 1)}</div>}
      </div>
    ));
  }

  const tree = buildTree(categories);

  return (
    <div className="mx-auto max-w-3xl">
      <CardHeader className="px-0 pb-6">
        <CardTitle>Categorías</CardTitle>
        <CardDescription>
          Organice el catálogo en una jerarquía de categorías. Arrastre una categoría sobre otra para hacerla hija, o
          sobre el área inferior para volverla raíz.
        </CardDescription>
      </CardHeader>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {success && <p className="mb-4 text-sm text-emerald-600">{success}</p>}

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Cargando categorías...</div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <FolderPlus className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aún no hay categorías en esta tienda.</p>
              <button type="button" onClick={() => startCreate()} className={buttonVariants({ variant: "outline" })}>
                <Plus />
                Crear la primera categoría
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {renderTree(tree, 0)}

              {/* Zona de drop para volver a raíz */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId("__root__");
                }}
                onDrop={(e) => handleDrop(e, null)}
                onDragLeave={() => setDragOverId(null)}
                className={`mt-1 flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-xs transition-colors ${
                  dragOverId === "__root__"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {draggingId ? "Suelte aquí para volver la categoría a nivel raíz" : "Arrastre una categoría aquí para hacerla raíz"}
              </div>
            </div>
          )}

          {tree.length > 0 && (
            <div className="flex justify-end">
              <button type="button" onClick={() => startCreate()} className={buttonVariants({ variant: "outline" })}>
                <FolderPlus />
                Nueva categoría
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {(isNew || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar categoría" : "Nueva categoría"}</CardTitle>
            <CardDescription>
              {editingId
                ? "Modifique el nombre, slug o la categoría padre."
                : "El slug se genera automáticamente desde el nombre y debe ser único en la tienda."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 pt-1">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cat-name" className="text-sm font-medium">
                    Nombre
                  </label>
                  <Input
                    id="cat-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                        slug: editingId ? prev.slug : slugify(e.target.value),
                      }))
                    }
                    placeholder="Ej.: Ropa"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cat-slug" className="text-sm font-medium">
                    Slug
                  </label>
                  <Input
                    id="cat-slug"
                    value={form.slug}
                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="ropa"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cat-parent" className="text-sm font-medium">
                  Categoría padre
                </label>
                <select
                  id="cat-parent"
                  value={form.parentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">Ninguna (categoría raíz)</option>
                  {categories
                    .filter((cat) => !editingId || !collectBranchIds(categories, editingId).has(cat.id))
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={isSaving} className={buttonVariants({ variant: "default" })}>
                  {isSaving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear categoría"}
                </button>
                <button type="button" onClick={cancelForm} className={buttonVariants({ variant: "outline" })}>
                  Cancelar
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
