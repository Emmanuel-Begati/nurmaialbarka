import { isStaff, type Role } from "@/lib/auth/roles";

/** Where a signed-in user's "home" is inside the app (the public website lives at "/"). */
export const homePathFor = (roles: Role[]) => (isStaff(roles) ? "/dashboard" : "/portal");
