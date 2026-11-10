export const ROLES = ["admin", "bursar", "teacher", "parent", "student"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Super Admin",
  bursar: "Bursar",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
};

export function parseRoles(roles: string): Role[] {
  return roles
    .split(",")
    .map((r) => r.trim())
    .filter((r): r is Role => (ROLES as readonly string[]).includes(r));
}

export function hasRole(roles: Role[], ...wanted: Role[]) {
  return wanted.some((w) => roles.includes(w));
}

export const isStaff = (roles: Role[]) => hasRole(roles, "admin", "bursar", "teacher");
export const canSeeFees = (roles: Role[]) => hasRole(roles, "admin", "bursar");
