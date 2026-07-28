// ── Enum ───────────────────────────────────────────────────────────────────────

export enum Role {
  super_admin = "super_admin",
  admin = "admin",
  staff = "staff",
  customer = "customer",
}

// ── Hierarchy ──────────────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.super_admin]: 4,
  [Role.admin]: 3,
  [Role.staff]: 2,
  [Role.customer]: 1,
};

/**
 * Check if `userRole` has at least the authority of `required`.
 *
 * Example:
 *   hasMinRole(Role.admin, Role.staff)   → true  (admin ≥ staff)
 *   hasMinRole(Role.staff, Role.admin)   → false (staff < admin)
 */
export function hasMinRole(userRole: Role, required: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}
