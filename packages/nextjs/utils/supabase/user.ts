import { supabaseAdmin } from "./admin";
import type { JWTPayload } from "jose";

export type PrivyAccessTokenPayload = JWTPayload & {
  sub: string; // Privy DID (stable user id)
};

export async function getOrCreateUserUuidFromPrivyPayload(payload: PrivyAccessTokenPayload): Promise<string> {
  if (!payload?.sub) throw new Error("privy_payload_missing_sub");
  const privyDid = payload.sub;

  // 1) Lookup existing user by privy_did
  {
    const { data, error } = await supabaseAdmin.from("users").select("id").eq("privy_did", privyDid).maybeSingle();
    if (error) throw new Error(`users_lookup_failed:${error.message}`);
    if (data?.id) return data.id as string;
  }

  // 2) Optional email enrichment (not present in Privy Access Tokens by default)
  const email: string | null = null;

  // 3) Insert new user
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("users")
    .insert({ privy_did: privyDid, email })
    .select("id")
    .single();
  if (insertErr) {
    // Handle race condition on unique(privy_did)
    if ((insertErr as any).code === "23505") {
      const { data: again, error: againErr } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("privy_did", privyDid)
        .single();
      if (againErr || !again?.id) throw new Error(`users_select_after_conflict_failed:${againErr?.message}`);
      return again.id as string;
    }
    throw new Error(`users_insert_failed:${insertErr.message}`);
  }
  return inserted!.id as string;
}
