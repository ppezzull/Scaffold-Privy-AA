import { Database } from "../models/supabase";
import { createClient } from "@supabase/supabase-js";

// Server-only Supabase admin client. Use this for admin operations (upserts, migrations,
// issuing custom tokens, etc.). MUST run only on the server — never expose the service role key
// to the browser.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE config in environment: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
  );
}

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  // Optional: set a custom header to help identify server requests in logs
  global: { headers: { "x-supabase-admin": "scaffold-privy-aa" } },
});

export default supabaseAdmin;
