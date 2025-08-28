# Using Privy as the authentication provider (with Supabase via Server Actions token exchange)

Users authenticate with **Privy** (existing wallets + embedded). A **Server Action** verifies Privy’s JWT (via Privy **JWKS**) and mints a **short‑lived Supabase‑signed JWT** that your Supabase client uses for RLS‑safe queries. This aligns with Privy’s JWT‑based integration model and Supabase’s signing‑keys/JWKS architecture. ([Privy Docs][1], [Supabase][2])

---

## 0) Environment & prerequisites

Copy `packages/nextjs/.env.example` to `packages/nextjs/.env.local` and fill in:

```bash
# REQUIRED
NEXT_PUBLIC_ALCHEMY_API_KEY=
NEXT_PUBLIC_PRIVY_APP_ID=

# Supabase (Privy-auth + RLS)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=
```

Server-only secret required by the Server Action (included in `.env.example`; do NOT prefix with NEXT_PUBLIC):

```bash
# Private key used by your app to mint Supabase JWTs (PEM: RS256 or ES256)
# Paste as multi-line PEM with BEGIN/END in .env.local, or use \n escapes if your host requires.
SUPABASE_JWT_PRIVATE_KEY=
```

Admin key for user upserts (included in `.env.example`; server-only):

```bash
# Supabase service role key used by server-only admin client to upsert users before a session exists
# NEVER expose client-side. Configure in your platform’s server env (e.g., Vercel project settings).
SUPABASE_SERVICE_ROLE_KEY=
```

* Ensure your Supabase project uses **asymmetric Signing Keys** (JWKS available at `/auth/v1/.well-known/jwks.json`). ([Supabase][2], [DEV Community][3])
* We’ll **verify Privy tokens** against **Privy’s JWKS**: `https://auth.privy.io/api/v1/apps/<APP_ID>/jwks.json`. ([Privy Docs][1])

Install deps:

```bash
yarn add @privy-io/react-auth @supabase/supabase-js jose
```

(Use npm/pnpm if you prefer.)

---

## 1) High‑level flow (Option A)

1. User logs in with **Privy** (existing wallet or embedded).
2. Client calls a **Server Action** with the **Privy access token**.
3. Server Action **verifies** Privy JWT via **Privy JWKS** → maps/creates a local user UUID → **mints** a short‑lived **Supabase‑signed JWT** (`sub` = your users UUID, `role` = `authenticated`). Supabase uses these claims for **RLS**. ([Privy Docs][1], [Supabase][4])
4. Supabase JS client is configured with `accessToken: async () => <exchanged JWT>` so all DB calls run under your policies. ([Supabase][5])

---

## 2) Providers (Privy‑first UX)

`components/Providers.tsx`

```tsx
'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        // Offer both: existing wallets + embedded
        // (Configure wallet connectors in the Privy Dashboard as needed)
        embeddedWallets: { createOnLogin: 'all-users' },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
```

Privy’s JWT model is designed to integrate with external providers and remain the source of truth for auth/wallet state. ([Privy Docs][1])

Add it to `app/layout.tsx`:

```tsx
import Providers from '@/components/Providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
```

---

## 3) **Server Action**: verify Privy → mint Supabase JWT

Create `app/(auth)/actions.ts`:

```ts
'use server'

import { jwtVerify, createRemoteJWKSet, importPKCS8, SignJWT } from 'jose'
import { getOrCreateUserUuidFromPrivyPayload } from '@/lib/supabase/user'

// Privy JWKS for your app
const PRIVY_JWKS = createRemoteJWKSet(
  new URL(`https://auth.privy.io/api/v1/apps/${process.env.NEXT_PUBLIC_PRIVY_APP_ID}/jwks.json`)
)

// Your Supabase private signing key (PEM). This key signs the *exchanged* JWT used by Supabase services.
const SUPABASE_JWT_PRIVATE_KEY = process.env.SUPABASE_JWT_PRIVATE_KEY!
const SUPABASE_ISS = `https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '')}/auth/v1` // issuer

// Implementation for user mapping is shown in section 3.1 — see `lib/supabase/user` for a production-ready helper

export async function exchangePrivyToken(privyAccessToken: string): Promise<string> {
  if (!privyAccessToken) throw new Error('missing_privy_token')

  // 1) Verify the Privy token using Privy’s JWKS
  const { payload } = await jwtVerify(privyAccessToken, PRIVY_JWKS)

  // 2) Map Privy identity -> your local users UUID (for RLS)
  const userUuid = await getOrCreateUserUuidFromPrivyPayload(payload)

  // 3) Mint a short-lived Supabase-signed JWT
  const alg = 'RS256' // or 'ES256' if your key is EC
  const privateKey = await importPKCS8(SUPABASE_JWT_PRIVATE_KEY, alg)

  const now = Math.floor(Date.now() / 1000)
  const exp = now + 60 * 30 // 30 minutes

  const supabaseJwt = await new SignJWT({
    sub: userUuid,           // must be your users table UUID so auth.uid() works
    role: 'authenticated',   // typical role used by RLS
    // add any app-specific claims required by RLS policies
  })
    .setProtectedHeader({ alg })
    .setIssuer(SUPABASE_ISS)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(privateKey)

  return supabaseJwt
}
```

### 3.1) Production-ready user mapping (admin upsert)

We key on `payload.sub` (the user’s Privy DID) as the stable external identifier, upsert a row in `users`, and return our internal UUID so the exchanged Supabase JWT can set `sub = <uuid>` for RLS. This requires a server-only Supabase admin client using the Service Role key.

Suggested schema (SQL):

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

Admin client (server-only):

```ts
// lib/supabase/admin.ts (server-only)
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NEVER expose client-side
  { auth: { persistSession: false } }
)
```

Finished function (replace the TODO in your Server Action file):

```ts
import { supabaseAdmin } from '@/lib/supabase/admin'

type PrivyAccessTokenPayload = {
  sub: string;           // Privy DID (stable user id)
  sid?: string;
  iss?: string;          // 'privy.io'
  aud?: string;          // your app id
  iat?: number;
  exp?: number;
  // If using an Identity Token instead of Access Token, you may also see:
  // linked_accounts?: string;   // JSON string
  // custom_metadata?: string;   // JSON string
}

export async function getOrCreateUserUuidFromPrivyPayload(
  payload: PrivyAccessTokenPayload
): Promise<string> {
  if (!payload?.sub) throw new Error('privy_payload_missing_sub')
  const privyDid = payload.sub

  // 1) Lookup
  {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('privy_did', privyDid)
      .maybeSingle()
    if (error) throw new Error(`users_lookup_failed:${error.message}`)
    if (data?.id) return data.id
  }

  // 2) Optional: parse email from Identity Token (not present in Access Tokens)
  let email: string | null = null
  // Example if later using Identity Token with linked_accounts JSON:
  // try {
  //   const la = (payload as any)?.linked_accounts ? JSON.parse((payload as any).linked_accounts) : []
  //   const emailAcc = la.find((a: any) => a?.type === 'email' && a?.address)
  //   email = emailAcc?.address ?? null
  // } catch {}

  // 3) Insert
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('users')
    .insert({ privy_did: privyDid, email })
    .select('id')
    .single()
  if (insertErr) {
    // Handle race: unique violation
    if ((insertErr as any).code === '23505') {
      const { data: again, error: againErr } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('privy_did', privyDid)
        .single()
      if (againErr || !again?.id) throw new Error(`users_select_after_conflict_failed:${againErr?.message}`)
      return again.id
    }
    throw new Error(`users_insert_failed:${insertErr.message}`)
  }
  return inserted.id
}
```

Why `payload.sub`:

- Privy’s access token is a JWT that includes `sub` as the user’s Privy DID (stable identifier). Use it to link local users. ([Privy Docs][1])
- If you enable Identity Tokens, they also include `sub` plus richer fields (e.g., `linked_accounts`, `custom_metadata`) you can parse to hydrate optional columns like `email`. ([Privy Docs][6])

**Why this works:**

* Privy tokens are validated against **Privy’s JWKS** per their JWT‑based auth model. ([Privy Docs][1])
* Supabase services verify **your** exchanged JWT via your project’s **JWKS**; RLS uses claims like `sub` and `role`. ([Supabase][2])

---

## 4) Supabase client with **custom access token**

`lib/supabase/client.ts`

```ts
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAccessToken } from '@/lib/token-cache'

// IMPORTANT: use the accessToken callback (official pattern for custom tokens)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
  {
    accessToken: async () => {
      const token = await getSupabaseAccessToken()
      return token ?? ''
    },
  }
)
```

Supabase JS supports providing your own access token via the `accessToken` option; that token will be attached to requests and used for RLS. ([Supabase][5])

---

## 5) Client‑side token cache + sync with Privy

We’ll keep a small in‑memory token cache and refresh it via a client helper that calls the **Server Action**.

`lib/token-cache.ts`

```ts
'use client'

import { exchangePrivyToken } from '@/app/(auth)/actions'
import { getPrivyToken } from '@/lib/privy-helpers'

let cached: { token: string; exp: number } | null = null

function nowSec() {
  return Math.floor(Date.now() / 1000)
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (cached && cached.exp - 30 > nowSec()) {
    return cached.token
  }
  const privyToken = await getPrivyToken() // read current Privy access token (client)
  if (!privyToken) return null

  // Call Server Action to exchange
  const supaToken = await exchangePrivyToken(privyToken)

  // Decode exp (cheap decode: header.payload.signature -> payload base64)
  const payload = JSON.parse(atob(supaToken.split('.')[1]))
  cached = { token: supaToken, exp: payload.exp }
  return supaToken
}

// Optionally expose a way to clear cache on logout
export function clearSupabaseTokenCache() {
  cached = null
}
```

`lib/privy-helpers.ts`

```ts
'use client'

import { usePrivy, getAccessToken } from '@privy-io/react-auth'

// Option A: Hook usage from components
export function usePrivyAccessToken() {
  const { user, ready, authenticated, getAccessToken } = usePrivy()
  const read = async () => (authenticated ? await getAccessToken() : null)
  return { user, ready, authenticated, read }
}

// Option B: plain helper (when outside components)
export async function getPrivyToken(): Promise<string | null> {
  try {
    // @privy-io/react-auth exports getAccessToken in recent SDKs; otherwise read via usePrivy()
    // If unavailable, expose a small context that stores the last token.
    // @ts-ignore
    const token = await getAccessToken?.()
    return token ?? null
  } catch {
    return null
  }
}
```

Privy’s “use your own auth” pattern uses hooks to keep the SDK in sync; in **Privy‑first**, the SDK *is* the source of truth and can provide the current access token to exchange. ([Privy Docs][6])

---

## 6) RLS policy checklist

* Your policies likely rely on `auth.uid()`; set `sub` in the exchanged JWT to your **users.id (UUID)**.
* Set `role = 'authenticated'` (or your chosen role).
* Add any custom claims your policies expect. Supabase explains how JWTs power RLS and how services verify them. ([Supabase][4])

---

## 7) “Balls‑deep” execution plan

**Phase A — Foundations (1–2 hrs)**

1. **Enable asymmetric keys** in Supabase and confirm project **JWKS** endpoint works. ([Supabase][2])
2. In Privy Dashboard, configure **wallet connectors** (Injected/WalletConnect/Coinbase) and optional **embedded wallets**. (Privy supports JWT‑based auth integrations and mixed wallet UX). ([Privy Docs][1])
3. Add ENV vars; install `@privy-io/react-auth`, `@supabase/supabase-js`, `jose`.

**Deliverables:** `.env.local`, Providers scaffold, packages installed.

---

**Phase B — Token Exchange via Server Actions (2–3 hrs)**

1. Implement **Server Action** `exchangePrivyToken()` (verify with Privy JWKS → mint Supabase JWT using your **private signing key**). Use `jose`’s `createRemoteJWKSet`, `jwtVerify`, and `importPKCS8`/`SignJWT`. ([Privy Docs][1])
2. Implement user mapping `getOrCreateUserUuidFromPrivyPayload()` (DB insert/select).
3. Build **client token cache** + helper to grab current Privy token and call the Server Action.
4. Configure Supabase JS **with** `accessToken` callback returning the exchanged token. ([Supabase][5])

**Deliverables:** `app/(auth)/actions.ts`, `lib/token-cache.ts`, `lib/privy-helpers.ts`, `lib/supabase/client.ts`.

---

**Phase C — Auth UI & lifecycle (1–2 hrs)**

1. Wire **PrivyProvider**; add a minimal **Sign In** button using Privy’s UI (or auto‑prompt).
2. On **login**: first Supabase call triggers `accessToken()` → exchange → you’re RLS‑authorized.
3. On **logout**: call Privy logout → clear local cache (`clearSupabaseTokenCache()`).

**Deliverables:** Working login/logout; Supabase queries return user‑scoped results.

---

**Phase D — Security & production hardening (1–2 hrs)**

1. Rotate **Supabase signing keys** and verify your minted tokens are accepted (JWKS discovery). ([Supabase][2])
2. Shorten token TTL (e.g., 15–30 min) and implement silent refresh on 401.
3. Add rate limiting to Server Action (per IP/session) and basic telemetry.
4. Ensure `SUPABASE_JWT_PRIVATE_KEY` is **never** exposed client‑side; server actions run on the server only.
5. Validate Privy token audience/issuer if documented by your SDK version.

---

**Phase E — QA checklist**

* ✅ Privy login with **existing wallet** and **embedded wallet** both work.
* ✅ `exchangePrivyToken()` rejects invalid/expired Privy tokens.
* ✅ Supabase query includes exchanged JWT; RLS enforces `auth.uid() = users.id`.
* ✅ Key rotation test passes (new public key published on JWKS recognized). ([Supabase][2])
* ✅ Server Action never leaks the private key.

---

## 8) References

* **Privy — Using your own authentication (JWT‑based)**: overview & React “subscribe” integration. ([Privy Docs][1])
* **Privy — Configure authentication (JWKS in dashboard)**: where JWKS is registered. ([Privy Docs][7])
* **Supabase — JWT Signing Keys** (asymmetric keys + JWKS). ([Supabase][2], [DEV Community][3])
* **Supabase JS — custom `accessToken` option**. ([Supabase][5])
* **Next.js App Router / Server Actions** (for architectural grounding). ([Next.js][8], [Robin Wieruch][9], [DEV Community][10])

---

### Final note

This plan uses **no API routes**—only **Server Actions**—and matches your ENV format. It gives you Privy’s best UX (existing + embedded wallets) while keeping Supabase’s **RLS** airtight via exchanged, project‑signed JWTs. If you want, I can also add a tiny **SQL migration** for the `users` table and a sample `getOrCreateUserUuidFromPrivyPayload()` implementation wired to your schema.

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
