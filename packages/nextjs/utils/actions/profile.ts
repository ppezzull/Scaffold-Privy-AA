"use server";

import { cookies } from "next/headers";
import { Database } from "../models/supabase";
import { createClient as createServerSupabase } from "../supabase/server";
import { decodeJwt } from "jose";

export type UserRow = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name" | "surname" | "created_at">;

export async function fetchPublicUsersAction(): Promise<UserRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id,name,surname,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`${error.code ?? "db_error"}: ${error.message}`);
  return data ?? [];
}

export async function fetchMeAction(): Promise<UserRow | null> {
  const supabase = await createServerSupabase();
  // Filter by the current user's sub from the cookie-backed JWT to avoid multi-row responses.
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return null;
  let sub: string | undefined;
  try {
    const decoded = decodeJwt(token) as { sub?: string };
    sub = decoded.sub;
  } catch {
    return null;
  }
  if (!sub) return null;
  const { data, error } = await supabase.from("users").select("id,name,surname,created_at").eq("id", sub).maybeSingle();
  // If no session is present, RLS will reject with permission denied; treat as unauthenticated (null).
  if (error) {
    if (error.code === "42501" /* permission denied */) return null;
    return Promise.reject(new Error(`${error.code ?? "db_error"}: ${error.message}`));
  }
  return data ?? null;
}

export async function updateMeAction(fields: { name: string | null; surname: string | null }): Promise<UserRow | null> {
  const supabase = await createServerSupabase();
  // Resolve the current user's id from the cookie-backed JWT and update that row.
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) throw new Error("not_authenticated");
  let sub: string | undefined;
  try {
    const decoded = decodeJwt(token) as { sub?: string };
    sub = decoded.sub;
  } catch {
    throw new Error("not_authenticated");
  }
  if (!sub) throw new Error("not_authenticated");
  const { data, error } = await supabase
    .from("users")
    .update(fields)
    .eq("id", sub)
    .select("id,name,surname,created_at")
    .maybeSingle();
  if (error) {
    if (error.code === "42501") throw new Error("not_authenticated");
    throw new Error(`${error.code ?? "db_error"}: ${error.message}`);
  }
  return data ?? null;
}
// Intentionally no form-based action; the server client attaches cookies and session automatically.
