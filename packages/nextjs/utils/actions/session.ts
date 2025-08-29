import { createClient as createBrowserSupabase } from "~~/utils/supabase/client";

export async function createSupabaseSessionFromJwt(token: string | null) {
  if (!token) return null;
  const supabase = createBrowserSupabase();
  try {
    // supabase-js v2: setSession accepts access_token and refresh_token
    const { data, error } = await supabase.auth.setSession({ access_token: token, refresh_token: token });
    if (error) {
      console.error("Failed to set supabase session from jwt:", error);
      return null;
    }
    return data?.session ?? null;
  } catch (err) {
    // defensive
    console.error("Error creating supabase session from jwt", err);
    return null;
  }
}
