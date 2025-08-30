"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { decodeJwt } from "jose";

export type UserRow = {
  id: string;
  name: string | null;
  surname: string | null;
  created_at: string;
};

function getSupabaseAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!;
  return createClient(url, key);
}

function getSupabaseUserClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!;
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } });
}

export async function fetchPublicUsersAction(): Promise<UserRow[]> {
  const supabase = getSupabaseAnonClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,name,surname,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`${error.code ?? "db_error"}: ${error.message}`);
  return (data as UserRow[]) ?? [];
}

export async function fetchMeAction(token: string): Promise<UserRow | null> {
  const supabase = getSupabaseUserClient(token);
  // Decode JWT sub reliably
  let sub: string | undefined;
  try {
    const decoded = decodeJwt(token) as { sub?: string };
    sub = decoded.sub;
  } catch {
    throw new Error("invalid_token: cannot decode sub");
  }
  if (!sub) throw new Error("invalid_token: missing sub");
  const { data, error } = await supabase.from("users").select("id,name,surname,created_at").eq("id", sub).maybeSingle();
  if (error) throw new Error(`${error.code ?? "db_error"}: ${error.message}`);
  return (data as UserRow) ?? null;
}

export async function updateMeAction(
  token: string,
  fields: { name: string | null; surname: string | null },
): Promise<UserRow | null> {
  const supabase = getSupabaseUserClient(token);
  // Target by sub to avoid editing others; RLS will enforce owner-only anyway
  let sub: string | undefined;
  try {
    const decoded = decodeJwt(token) as { sub?: string };
    sub = decoded.sub;
  } catch {
    throw new Error("invalid_token: cannot decode sub");
  }
  if (!sub) throw new Error("invalid_token: missing sub");
  const { data, error } = await supabase
    .from("users")
    .update(fields)
    .eq("id", sub)
    .select("id,name,surname,created_at")
    .maybeSingle();
  if (error) throw new Error(`${error.code ?? "db_error"}: ${error.message}`);
  return (data as UserRow) ?? null;
}

export type UpdateState = { ok: boolean; error?: string | null; data?: UserRow | null };

export async function updateMeFromCookieAction(_prev: UpdateState, form: FormData): Promise<UpdateState> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;
    if (!token) return { ok: false, error: "Not authenticated" };

    const nameRaw = (form.get("name") as string) ?? "";
    const surnameRaw = (form.get("surname") as string) ?? "";
    const fields = {
      name: nameRaw.trim() || null,
      surname: surnameRaw.trim() || null,
    };

    const data = await updateMeAction(token, fields);
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Update failed" };
  }
}
