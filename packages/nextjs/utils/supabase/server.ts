// lib/supabase/server.ts
import { cookies } from "next/headers";
import { Database } from "../models/supabase";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client that sends your exchanged JWT on every request.
 * If you're using Fluid compute, always create a fresh client per invocation.
 */
export async function createClient(exchangedJwt?: string) {
  const cookieStore = await cookies();

  // Prefer an explicit token if provided; otherwise pull the one you set after exchange.
  // Example cookie name used in our guide: 'sb-access-token' (HttpOnly, Secure)
  const token = exchangedJwt ?? cookieStore.get("sb-access-token")?.value ?? "";

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component (no mutation); safe to ignore
            // if you refresh tokens via middleware / a server action.
          }
        },
      },
      // Attach your exchanged JWT so PostgREST/Storage/Realtime apply RLS as this user.
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    },
  );
}
