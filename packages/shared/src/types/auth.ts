import type { Role } from "./role.js";

// ── Requests ───────────────────────────────────────────────────────────────────

export interface LoginRequest {
  slug: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUserDTO;
  accessToken: string;
}

export interface AuthUserDTO {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  tenantId: string | null;
  tenantSlug: string | null;
  isActive: boolean;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
  slug: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// ── JWT ────────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  role: Role;
  tenantSlug: string;
  iat: number;
  exp: number;
}
