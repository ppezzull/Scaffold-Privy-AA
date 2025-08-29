"use server";

import { getOrCreateUserUuidFromPrivyPayload } from "../supabase/user";
import { JWTPayload, SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from "jose";

// Build Privy JWKS URL using the configured Privy App ID
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
if (!PRIVY_APP_ID) {
  throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
}
const PRIVY_APP_ID_STR: string = PRIVY_APP_ID;
const PRIVY_JWKS = createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID_STR}/jwks.json`));

// Supabase private signing key (PEM) used to sign exchanged JWTs
const SUPABASE_JWT_PRIVATE_KEY = process.env.SUPABASE_JWT_PRIVATE_KEY;
if (!SUPABASE_JWT_PRIVATE_KEY) {
  throw new Error("SUPABASE_JWT_PRIVATE_KEY is not set");
}
const SUPABASE_JWT_PRIVATE_KEY_STR: string = SUPABASE_JWT_PRIVATE_KEY;

// Issuer must match your Supabase project's auth issuer
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
const SUPABASE_URL_STR: string = SUPABASE_URL;
const SUPABASE_ISS = `https://${SUPABASE_URL_STR.replace(/^https?:\/\//, "")}/auth/v1`;

// Narrow type for just what we use from Privy payloads
export type PrivyAccessTokenPayload = JWTPayload & {
  sub: string; // Privy DID (stable identifier)
};

/**
 * Exchange a Privy Access Token for a short-lived Supabase-signed JWT
 * suitable for RLS. The returned JWT will have sub=<users.id> and role=authenticated.
 */
export async function exchangePrivyToken(privyAccessToken: string): Promise<string> {
  if (!privyAccessToken) throw new Error("missing_privy_token");

  // 1) Verify the Privy token using Privy's JWKS
  let payload: PrivyAccessTokenPayload;
  try {
    const verified = await jwtVerify(privyAccessToken, PRIVY_JWKS);
    payload = verified.payload as PrivyAccessTokenPayload;
  } catch (err: any) {
    throw new Error(`privy_verify_failed:${err?.message ?? "unknown"}`);
  }

  // 2) Map Privy identity -> local users UUID for RLS
  let userUuid: string;
  try {
    userUuid = await getOrCreateUserUuidFromPrivyPayload(payload);
  } catch (err: any) {
    throw new Error(`users_upsert_failed:${err?.message ?? "unknown"}`);
  }

  // 3) Mint a short-lived Supabase-signed JWT
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 30; // 30 minutes

  try {
    // Detect key algorithm by trying RS256 first, then ES256
    let alg: "RS256" | "ES256" = "RS256";
    let privateKey: CryptoKey;
    try {
      privateKey = await importPKCS8(SUPABASE_JWT_PRIVATE_KEY_STR, alg);
    } catch {
      alg = "ES256";
      privateKey = await importPKCS8(SUPABASE_JWT_PRIVATE_KEY_STR, alg);
    }

    const supabaseJwt = await new SignJWT({
      sub: userUuid,
      role: "authenticated",
    })
      .setProtectedHeader({ alg })
      .setIssuer(SUPABASE_ISS)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(privateKey);

    return supabaseJwt;
  } catch (err: any) {
    throw new Error(`supabase_sign_failed:${err?.message ?? "unknown"}`);
  }
}
