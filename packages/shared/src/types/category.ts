// ── DTOs ───────────────────────────────────────────────────────────────────────

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDTO {
  name: string;
  slug: string;
  parentId?: string;
}

export interface UpdateCategoryDTO {
  name?: string;
  slug?: string;
  parentId?: string | null;
}

/** Recursive tree node for public category navigation */
export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  children: CategoryTreeNode[];
}
