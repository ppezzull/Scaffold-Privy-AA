"use server";

import { cookies } from "next/headers";
import { getOrCreateUserUuidFromPrivyPayload } from "./user";
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

// JWT algorithm for signing Supabase tokens (configurable: RS256 or ES256)
const ALG_ENV = process.env.SUPABASE_JWT_ALG;
const ALG = (ALG_ENV === "RS256" ? "RS256" : "ES256") as "RS256" | "ES256";

// Optional: specify a KID that matches a key in your Supabase project's JWKS
const SUPABASE_JWT_KID = process.env.SUPABASE_JWT_KID;

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

  // Debug: start
  try {
    console.log("[exchangePrivyToken] start", {
      privyTokenLen: privyAccessToken?.length ?? 0,
      privyAppIdSet: Boolean(PRIVY_APP_ID_STR),
      supabaseUrlHost: SUPABASE_URL_STR.replace(/^https?:\/\//, ""),
    });
  } catch {}

  // 1) Verify the Privy token using Privy's JWKS
  let payload: PrivyAccessTokenPayload;
  try {
    console.log("[exchangePrivyToken] verifying privy token against JWKS");
    const verified = await jwtVerify(privyAccessToken, PRIVY_JWKS);
    payload = verified.payload as PrivyAccessTokenPayload;
    console.log("[exchangePrivyToken] privy token verified", { sub: payload?.sub });
  } catch (err: any) {
    console.error("[exchangePrivyToken] privy_verify_failed", { message: err?.message });
    throw new Error(`privy_verify_failed:${err?.message ?? "unknown"}`);
  }

  // 2) Map Privy identity -> local users UUID for RLS
  let userUuid: string;
  try {
    console.log("[exchangePrivyToken] mapping privy DID -> local user uuid");
    userUuid = await getOrCreateUserUuidFromPrivyPayload(payload);
    console.log("[exchangePrivyToken] user mapped", { userUuid });
  } catch (err: any) {
    console.error("[exchangePrivyToken] users_upsert_failed", { message: err?.message });
    throw new Error(`users_upsert_failed:${err?.message ?? "unknown"}`);
  }

  // 3) Mint a short-lived Supabase-signed JWT
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 30; // 30 minutes

  try {
    // Import private key and sign with configured alg
    console.log("[exchangePrivyToken] importing signing key", { alg: ALG, kid: SUPABASE_JWT_KID ?? null });
    const privateKey = await importPKCS8(SUPABASE_JWT_PRIVATE_KEY_STR, ALG);

    console.log("[exchangePrivyToken] signing supabase jwt", {
      alg: ALG,
      kid: SUPABASE_JWT_KID ?? null,
      expInSec: exp - now,
    });
    const supabaseJwt = await new SignJWT({ sub: userUuid, role: "authenticated" })
      .setProtectedHeader({ alg: ALG, ...(SUPABASE_JWT_KID ? { kid: SUPABASE_JWT_KID } : {}) })
      .setIssuer(SUPABASE_ISS)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(privateKey);
    console.log("[exchangePrivyToken] signed supabase jwt", { tokenLen: supabaseJwt.length });

    // Also set an HttpOnly cookie so server-side Supabase client (SSR) can apply RLS without a session
    try {
      const cookieStore = await cookies();
      // Use the cookie name expected by Supabase SSR helpers
      cookieStore.set("sb-access-token", supabaseJwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: exp - now, // seconds
      });
      // Optional: clear any refresh token to avoid confusion (we don't use refresh flow here)
      cookieStore.set("sb-refresh-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      console.log("[exchangePrivyToken] set sb-access-token cookie for SSR");
    } catch (err: any) {
      console.warn("[exchangePrivyToken] failed setting cookie (non-fatal)", { message: err?.message });
    }
    return supabaseJwt;
  } catch (err: any) {
    console.error("[exchangePrivyToken] supabase_sign_failed", { message: err?.message });
    throw new Error(`supabase_sign_failed:${err?.message ?? "unknown"}`);
  }
}

/**
 * Clear the Supabase access cookie set by exchangePrivyToken, for logout.
 */
export async function clearSupabaseAuthCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set("sb-access-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    cookieStore.set("sb-refresh-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    console.log("[clearSupabaseAuthCookie] cleared");
  } catch (err: any) {
    console.warn("[clearSupabaseAuthCookie] failed", { message: err?.message });
  }
}
