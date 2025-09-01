# Using Privy as the authentication provider (with Supabase via Server Actions token exchange)

Users authenticate with **Privy** (existing wallets + embedded). A **Server Action** verifies Privy’s JWT (via Privy **JWKS**) and mints a **short‑lived Supabase‑signed JWT** that your Supabase client uses for RLS‑safe queries. This aligns with Privy’s JWT‑based integration model and Supabase’s signing‑keys/JWKS architecture. ([Privy Docs][1], [Supabase][2])

---

## 0) Environment & prerequisites

Copy `packages/nextjs/.env.example` to `packages/nextjs/.env.local` and fill in:

```bash
# Common
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_ALCHEMY_API_KEY=

# Supabase (URL + client key)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=

# Server-only admin (user upserts)
SUPABASE_SERVICE_ROLE_KEY=

# Signing config for exchanged JWTs
# Choose one algorithm:
#  - Local:   SUPABASE_JWT_ALG=HS256 and set SUPABASE_JWT_HS256_SECRET to your CLI secret
#  - Hosted:  SUPABASE_JWT_ALG=ES256 and set SUPABASE_JWT_PRIVATE_KEY (PEM or JWK) and optional SUPABASE_JWT_KID
SUPABASE_JWT_ALG=HS256|ES256
SUPABASE_JWT_HS256_SECRET=
SUPABASE_JWT_PRIVATE_KEY=
SUPABASE_JWT_KID=
```

Notes
- Issuer must match your project: `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1`
- Local CLI may not expose a JWKS endpoint; use HS256 locally. In production, prefer ES256 with JWKS.
- We verify Privy tokens against: `https://auth.privy.io/api/v1/apps/<APP_ID>/jwks.json`.

Install deps:

```bash
yarn add @privy-io/react-auth @supabase/supabase-js jose
```

(Use npm/pnpm if you prefer.)

---

## 1) High‑level flow

1. User logs in with **Privy** (existing wallet or embedded).
2. Client calls a **Server Action** with the **Privy access token**.
3. Server Action **verifies** Privy JWT via **Privy JWKS** → maps/creates a local user UUID → **mints** a short‑lived **Supabase‑signed JWT** (`sub` = your users UUID, `role` = `authenticated`). Supabase uses these claims for **RLS**. ([Privy Docs][1], [Supabase][4])
4. Supabase JS client is configured with `accessToken: async () => <exchanged JWT>` so all DB calls run under your policies. ([Supabase][5])

---

## 2) Providers and lifecycle wiring (Privy‑first UX)

This repo wires Supabase auth lifecycle alongside Privy in `packages/nextjs/components/providers/SupabaseProvider.tsx`.

Key points
- Uses `usePrivy()` to detect login/logout and warm/cool the Supabase token cache.
- Calls the Server Action to exchange the Privy token and sets an HttpOnly `sb-access-token` cookie.
- Clears the cookie and cache on logout via `clearSupabaseAuthCookie()`.

Excerpt: `packages/nextjs/components/providers/SupabaseProvider.tsx`

```tsx
const { authenticated, ready } = usePrivy()
const [client] = useState(() => createBrowserSupabase())

const refresh = useMemo(() => async function refresh() {
  setLoading(true)
  try {
    const token = await getSupabaseAccessToken()
    setClaims(decodeJwtUnsafe(token))
  } finally { setLoading(false) }
}, [])

useEffect(() => {
  if (!ready) return
  if (prevAuthRef.current === null && !authenticated) {
    clearSupabaseTokenCache(); setClaims(null)
  }
  if (authenticated && !warmedRef.current) { warmedRef.current = true; void refresh() }
  const prev = prevAuthRef.current
  if (prev === true && authenticated === false && !clearedOnceRef.current) {
    warmedRef.current = false; clearedOnceRef.current = true
    clearSupabaseTokenCache(); setClaims(null); void clearSupabaseAuthCookie()
  }
  prevAuthRef.current = authenticated
}, [authenticated, ready])
```

---

## 3) Server Action: verify Privy → mint Supabase JWT

Implemented at: `packages/nextjs/utils/actions/auth.ts`

Highlights
- Verifies Privy JWT via Privy JWKS
- Maps to local user UUID (upsert) using admin client
- Signs Supabase JWT with HS256 (local) or ES256 (prod)
- Sets `sb-access-token` HttpOnly cookie for SSR

Excerpt: `packages/nextjs/utils/actions/auth.ts`

```ts
const ALG = (process.env.SUPABASE_JWT_ALG || 'ES256') as 'ES256' | 'HS256'
const PRIVY_JWKS = createRemoteJWKSet(new URL(
  `https://auth.privy.io/api/v1/apps/${process.env.NEXT_PUBLIC_PRIVY_APP_ID}/jwks.json`
))
const SUPABASE_ISS = `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')}/auth/v1`

export async function exchangePrivyToken(privyAccessToken: string): Promise<string> {
  const verified = await jwtVerify(privyAccessToken, PRIVY_JWKS)
  const userUuid = await getOrCreateUserUuidFromPrivyPayload(verified.payload as JWTPayload)

  const now = Math.floor(Date.now()/1000); const exp = now + 60*30
  let supabaseJwt: string
  if (ALG === 'ES256') {
    const key = process.env.SUPABASE_JWT_PRIVATE_KEY!.trim().startsWith('-----BEGIN')
      ? await importPKCS8(process.env.SUPABASE_JWT_PRIVATE_KEY!.replace(/\\n/g, '\n'), 'ES256')
      : await importJWK(JSON.parse(process.env.SUPABASE_JWT_PRIVATE_KEY!), 'ES256')
    supabaseJwt = await new SignJWT({ sub: userUuid, role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: process.env.SUPABASE_JWT_KID, typ: 'JWT' })
      .setIssuer(SUPABASE_ISS).setIssuedAt(now).setExpirationTime(exp).sign(key)
  } else {
    const secret = (process.env.SUPABASE_JWT_HS256_SECRET || process.env.SUPABASE_JWT_PRIVATE_KEY || '').trim()
    const b64 = Buffer.from(secret, 'utf8').toString('base64').replace(/=+$/g,'').replace(/\+/g,'-').replace(/\//g,'_')
    const hmacKey = await importJWK({ kty:'oct', k:b64, alg:'HS256' }, 'HS256')
    supabaseJwt = await new SignJWT({ sub: userUuid, role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(SUPABASE_ISS).setIssuedAt(now).setExpirationTime(exp).sign(hmacKey)
  }
  // Set HttpOnly cookie for SSR
  ;(await cookies()).set('sb-access-token', supabaseJwt, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: exp-now })
  return supabaseJwt
}
```

### 3.1) Production-ready user mapping (admin upsert)

We key on `payload.sub` (the user’s Privy DID) as the stable external identifier, upsert a row in `users`, and return our internal UUID so the exchanged Supabase JWT can set `sub = <uuid>` for RLS. This requires a server-only Supabase admin client using the Service Role key.

Suggested schema (SQL): see `packages/supabase/migrations/20250828135151_init.sql` and `packages/supabase/migrations/20250830120000_add_profile_and_policies.sql`. Minimal shape:

```sql
-- one-time migration
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  privy_did text unique not null,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists users_privy_did_idx on public.users (privy_did);
```

Admin client (server-only): `packages/nextjs/utils/supabase/admin.ts`

```ts
import { Database } from "../models/supabase";
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false }, global: { headers: { "x-supabase-admin": "scaffold-privy-aa" } } }
);
```

User mapping helper: `packages/nextjs/utils/actions/user.ts`

```ts
export async function getOrCreateUserUuidFromPrivyPayload(payload: JWTPayload & { sub: string }): Promise<string> {
  if (!payload?.sub) throw new Error("privy_payload_missing_sub");
  const privyDid = payload.sub;
  {
    const { data, error } = await supabaseAdmin.from("users").select("id").eq("privy_did", privyDid).maybeSingle();
    if (error) throw new Error(`users_lookup_failed:${error.message}`);
    if (data?.id) return data.id as string;
  }
  const email: string | null = null;
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("users")
    .insert({ privy_did: privyDid, email })
    .select("id")
    .single();
  if (insertErr) {
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
```

Why `payload.sub`:

- Privy’s access token is a JWT that includes `sub` as the user’s Privy DID (stable identifier). Use it to link local users. ([Privy Docs][1])
- If you enable Identity Tokens, they also include `sub` plus richer fields (e.g., `linked_accounts`, `custom_metadata`) you can parse to hydrate optional columns like `email`. ([Privy Docs][6])

**Why this works:**

* Privy tokens are validated against **Privy’s JWKS** per their JWT‑based auth model. ([Privy Docs][1])
* Supabase services verify **your** exchanged JWT via your project’s **JWKS**; RLS uses claims like `sub` and `role`. ([Supabase][2])

---

## 4) Supabase client with custom access token (browser)

Implemented at: `packages/nextjs/utils/supabase/client.ts`

```ts
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAccessToken } from "~~/services/store/token-cache";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    { accessToken: async () => (await getSupabaseAccessToken()) ?? "" }
  );
}
```

Supabase JS supports providing your own access token via the `accessToken` option; that token will be attached to requests and used for RLS. ([Supabase][5])

---

## 5) Client‑side token cache + sync with Privy

Implemented at: `packages/nextjs/services/store/token-cache.ts`

```ts
"use client";

import { getPrivyToken } from "../../services/web3/privyToken";
import { exchangePrivyToken } from "~~/utils/actions/auth";

let cached: { token: string; exp: number } | null = null;
const LS_KEY = "sb_exch";

function nowSec() { return Math.floor(Date.now() / 1000) }

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!cached && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { token: string; exp: number };
        if (parsed?.token && parsed?.exp && parsed.exp - 30 > nowSec()) cached = parsed;
      }
    } catch {}
  }
  if (cached && cached.exp - 30 > nowSec()) return cached.token;
  const privyToken = await getPrivyToken();
  if (!privyToken) return null;
  const supaToken = await exchangePrivyToken(privyToken);
  try {
    const payload = JSON.parse(atob(supaToken.split(".")[1] ?? ""));
    cached = { token: supaToken, exp: payload.exp ?? nowSec() + 600 };
  } catch { cached = { token: supaToken, exp: nowSec() + 600 } }
  try { if (typeof window !== "undefined") window.localStorage.setItem(LS_KEY, JSON.stringify(cached)) } catch {}
  return supaToken;
}

export function clearSupabaseTokenCache() {
  cached = null; try { if (typeof window !== "undefined") window.localStorage.removeItem(LS_KEY) } catch {}
}
```

Privy token helper: `packages/nextjs/services/web3/privyToken.ts`

```ts
"use client";

import { getAccessToken, usePrivy } from "@privy-io/react-auth";

export async function getPrivyToken(): Promise<string | null> {
  try {
    // getAccessToken may be undefined in some SDK versions
    // @ts-ignore
    const token = await getAccessToken?.();
    return token ?? null;
  } catch {
    return null;
  }
}

export function usePrivyAccessToken() {
  const { authenticated, getAccessToken: hookGetAccessToken, user, ready } = usePrivy();
  const read = async () => (authenticated ? await hookGetAccessToken() : null);
  return { user, ready, authenticated, read };
}
```

Privy’s “use your own auth” pattern uses hooks to keep the SDK in sync; in **Privy‑first**, the SDK is the source of truth and can provide the current access token to exchange. ([Privy Docs][6])

---

## 6) Supabase server client (SSR)

Implemented at: `packages/nextjs/utils/supabase/server.ts`

```ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient(exchangedJwt?: string) {
  const cookieStore = await cookies();
  const token = exchangedJwt ?? cookieStore.get("sb-access-token")?.value ?? "";
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    }
  );
}
```

## 7) RLS policy checklist

* Your policies likely rely on `auth.uid()`; set `sub` in the exchanged JWT to your `users.id` (UUID). See `packages/supabase/migrations/20250830120000_add_profile_and_policies.sql`.
* Set `role = 'authenticated'` (or your chosen role).
* Add any custom claims your policies expect. Supabase explains how JWTs power RLS and how services verify them. ([Supabase][4])

---

That’s it. With this wiring, Privy remains your source of truth for auth, while Supabase enforces RLS using a short‑lived, app‑signed JWT that encodes your users UUID in `sub`.


## 8) References

* **Privy — Using your own authentication (JWT‑based)**: overview & React “subscribe” integration. ([Privy Docs][1])
* **Privy — Configure authentication (JWKS in dashboard)**: where JWKS is registered. ([Privy Docs][7])
* **Supabase — JWT Signing Keys** (asymmetric keys + JWKS). ([Supabase][2], [DEV Community][3])
* **Supabase JS — custom `accessToken` option**. ([Supabase][5])
* **Next.js App Router / Server Actions** (for architectural grounding). ([Next.js][8], [Robin Wieruch][9], [DEV Community][10])

---

 

[1]: https://docs.privy.io/authentication/user-authentication/jwt-based-auth?utm_source=chatgpt.com "Using your own authentication provider - Privy Docs"
[2]: https://supabase.com/docs/guides/auth/signing-keys?utm_source=chatgpt.com "JWT Signing Keys | Supabase Docs"
[3]: https://dev.to/supabase/introducing-jwt-signing-keys-4h3g?utm_source=chatgpt.com "Introducing JWT Signing Keys - DEV Community"
[4]: https://supabase.com/docs/guides/auth/jwts?utm_source=chatgpt.com "JSON Web Token (JWT) | Supabase Docs"
[5]: https://supabase.com/docs/reference/javascript/introduction?utm_source=chatgpt.com "JavaScript: Introduction | Supabase Docs"
[6]: https://docs.privy.io/authentication/user-authentication/jwt-based-auth/usage?utm_source=chatgpt.com "Integrating your authentication provider with Privy"
[7]: https://docs.privy.io/authentication/user-authentication/jwt-based-auth/setup?utm_source=chatgpt.com "Configuring your authentication provider - Privy Docs"
[8]: https://nextjs.org/docs/app?utm_source=chatgpt.com "Next.js Docs: App Router | Next.js"
[9]: https://www.robinwieruch.de/next-server-actions/?utm_source=chatgpt.com "Server Actions in Next.js - Robin Wieruch"
[10]: https://dev.to/alaa-m1/nextjs-14-app-router-server-actions-full-authentication-webapp-58k3?utm_source=chatgpt.com "Next.js 14 (App Router) with Server Actions - DEV Community"
