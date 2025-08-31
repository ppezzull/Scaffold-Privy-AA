import { Database } from "../models/supabase";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAccessToken } from "~~/services/store/token-cache";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      accessToken: async () => (await getSupabaseAccessToken()) ?? "",
    },
  );
}
