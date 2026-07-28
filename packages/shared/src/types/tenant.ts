import type { Role } from "./role.js";

// ── Enums ──────────────────────────────────────────────────────────────────────

export enum TenantStatus {
  active = "active",
  suspended = "suspended",
}

// ── DTOs ───────────────────────────────────────────────────────────────────────

export interface TenantDTO {
  id: string;
  name: string;
  slug: string;
  email: string;
  isActive: boolean;
  status: TenantStatus;
  theme?: TenantThemeDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantDTO {
  name: string;
  slug: string;
  email: string;
  isActive?: boolean;
}

export interface UpdateTenantDTO {
  name?: string;
  email?: string;
  isActive?: boolean;
  status?: TenantStatus;
}

export interface TenantThemeDTO {
  id: string;
  tenantId: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  fontFamily: string | null;
}

export interface UpdateThemeDTO {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily?: string;
}

// ── Auth helpers ───────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  tenantId: string | null;
  tenantSlug: string | null;
  isActive: boolean;
}
