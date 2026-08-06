import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import type { Profile, UserRole } from "@/lib/types/profile";

/**
 * Server Component page guard: redirects to /unauthorized if the current
 * user's role isn't in allowedRoles. Middleware already handles the
 * "not logged in" case (-> /login); this handles the "logged in but wrong
 * role" case for pages that need full-page protection rather than just
 * hiding a button (see <RoleGate> for that).
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<Profile> {
  const profile = await getCurrentUserProfile();

  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/unauthorized");
  }

  return profile;
}
