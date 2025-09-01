"use server";

import { cookies } from "next/headers";
import { getOrCreateUserUuidFromPrivyPayload } from "./user";
import { JWTPayload, SignJWT, createRemoteJWKSet, decodeJwt, importJWK, importPKCS8, jwtVerify } from "jose";

// Build Privy JWKS URL using the configured Privy App ID
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
if (!PRIVY_APP_ID) {
  throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
}
const PRIVY_APP_ID_STR: string = PRIVY_APP_ID;
const PRIVY_JWKS = createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID_STR}/jwks.json`));

// Supabase signing configuration
// ALG can be ES256 (asymmetric, recommended) or HS256 (symmetric, useful for local CLI defaults)
const ALG = (process.env.SUPABASE_JWT_ALG || "ES256") as "ES256" | "HS256";
// For ES256, require a private key (PEM or JWK) in SUPABASE_JWT_PRIVATE_KEY
// For HS256, prefer SUPABASE_JWT_HS256_SECRET, else fall back to SUPABASE_JWT_PRIVATE_KEY as a raw secret
const SUPABASE_JWT_PRIVATE_KEY = process.env.SUPABASE_JWT_PRIVATE_KEY;
const SUPABASE_JWT_HS256_SECRET = process.env.SUPABASE_JWT_HS256_SECRET;
if (ALG === "ES256") {
  if (!SUPABASE_JWT_PRIVATE_KEY) {
    throw new Error("SUPABASE_JWT_PRIVATE_KEY is not set (required for ES256)");
  }
}
const SUPABASE_JWT_PRIVATE_KEY_STR: string | undefined = SUPABASE_JWT_PRIVATE_KEY;

// Issuer must match your Supabase project's auth issuer
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
const SUPABASE_URL_STR: string = SUPABASE_URL;
// Preserve the protocol (http/https) from the configured URL
const SUPABASE_ISS = `${SUPABASE_URL_STR.replace(/\/$/, "")}/auth/v1`;

// Optional KID to match the configured JWKS key in Supabase
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

  // quiet: no verbose logs in production

  // 1) Verify the Privy token using Privy's JWKS
  let payload: PrivyAccessTokenPayload;
  try {
    const verified = await jwtVerify(privyAccessToken, PRIVY_JWKS);
    payload = verified.payload as PrivyAccessTokenPayload;
  } catch (err: any) {
    console.error("[exchangePrivyToken] privy_verify_failed", { message: err?.message });
    throw new Error(`privy_verify_failed:${err?.message ?? "unknown"}`);
  }

  // 2) Map Privy identity -> local users UUID for RLS
  let userUuid: string;
  try {
    userUuid = await getOrCreateUserUuidFromPrivyPayload(payload);
  } catch (err: any) {
    console.error("[exchangePrivyToken] users_upsert_failed", { message: err?.message });
    throw new Error(`users_upsert_failed:${err?.message ?? "unknown"}`);
  }

  // 3) Mint a short-lived Supabase-signed JWT
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 30; // 30 minutes

  try {
    // Reuse existing valid cookie token if it matches this user and isn't expiring soon
    try {
      const cookieStore = await cookies();
      const existing = cookieStore.get("sb-access-token")?.value;
      if (existing) {
        const decoded: any = decodeJwt(existing);
        const existingSub: string | undefined = decoded?.sub as string | undefined;
        const existingExp: number | undefined = decoded?.exp as unknown as number | undefined;
        if (existingSub === userUuid && typeof existingExp === "number" && existingExp - now > 60) {
          return existing;
        }
      }
    } catch {
      // Ignore cookie decode errors; we'll mint a fresh token below
    }

    // Build signing key based on ALG
    let kidHeader = SUPABASE_JWT_KID as string | undefined;
    let supabaseJwt: string;

    if (ALG === "ES256") {
      if (!SUPABASE_JWT_PRIVATE_KEY_STR) throw new Error("missing_es256_private_key");
      // Normalize PEM: if value contains literal \n escapes, convert to real newlines first
      const maybePem = SUPABASE_JWT_PRIVATE_KEY_STR.trim().startsWith("-----BEGIN")
        ? SUPABASE_JWT_PRIVATE_KEY_STR.replace(/\\n/g, "\n")
        : null;
      let privateKey: CryptoKey;
      if (maybePem) {
        privateKey = await importPKCS8(maybePem, ALG);
      } else {
        try {
          const parsed = JSON.parse(SUPABASE_JWT_PRIVATE_KEY_STR);
          const jwk = Array.isArray(parsed) ? parsed[0] : parsed;
          if (!kidHeader && typeof jwk?.kid === "string") kidHeader = jwk.kid as string;
          privateKey = (await importJWK(jwk, ALG)) as unknown as CryptoKey;
        } catch (e: any) {
          console.error("[exchangePrivyToken] invalid ES256 private key format", { message: e?.message });
          throw new Error("invalid_private_key_format");
        }
      }
      supabaseJwt = await new SignJWT({ sub: userUuid, role: "authenticated" })
        .setProtectedHeader({ alg: ALG, kid: kidHeader, typ: "JWT" })
        .setIssuer(SUPABASE_ISS)
        .setIssuedAt(now)
        .setExpirationTime(exp)
        .sign(privateKey);
    } else {
      // HS256 path for local dev with CLI default secret
      const secret = (SUPABASE_JWT_HS256_SECRET || SUPABASE_JWT_PRIVATE_KEY_STR || "").trim();
      if (!secret) {
        console.error("[exchangePrivyToken] missing HS256 secret: set SUPABASE_JWT_HS256_SECRET");
        throw new Error("missing_hs256_secret");
      }
      // Convert raw UTF-8 secret to base64url for oct JWK import
      const b64 = Buffer.from(secret, "utf8")
        .toString("base64")
        .replace(/=+$/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      const jwk = { kty: "oct", k: b64, alg: "HS256" } as const;
      const hmacKey = (await importJWK(jwk, "HS256")) as unknown as CryptoKey;
      supabaseJwt = await new SignJWT({ sub: userUuid, role: "authenticated" })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(SUPABASE_ISS)
        .setIssuedAt(now)
        .setExpirationTime(exp)
        .sign(hmacKey);
    }

    // Also set an HttpOnly cookie so server-side Supabase client (SSR) can apply RLS without a session
    try {
      const cookieStore = await cookies();
      // Use the cookie name expected by Supabase SSR helpers
      cookieStore.set("sb-access-token", supabaseJwt, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: exp - now, // seconds
      });
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
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  } catch (err: any) {
    console.warn("[clearSupabaseAuthCookie] failed", { message: err?.message });
  }
}
