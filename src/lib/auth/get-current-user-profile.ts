import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/profile";

/**
 * Server Component / Route Handler only — relies on next/headers cookies().
 * For Client Components use the `useCurrentUserProfile()` hook instead
 * (Next.js doesn't allow a single function to bridge both runtimes since
 * cookies() is server-only).
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (profile as Profile) ?? null;
}
