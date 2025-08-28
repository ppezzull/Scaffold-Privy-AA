# @se-2/supabase

Workspace for Supabase project utilities.

Scripts
-
- `yarn supabase:keygen` — Generate an ES256 signing key JWK to `packages/supabase/out/signing_key.json`.
- `yarn supabase:jwk-to-pem` — Convert the JWK to PKCS#8 PEM (saved to `packages/supabase/out/signing_key.pem`) and inject into `packages/nextjs/.env` as SUPABASE_JWT_PRIVATE_KEY.
- `yarn supabase:configure` — Runs keygen → jwk-to-pem.

Notes
- Requires Supabase CLI installed and logged in.
- No Supabase project linking is required for this flow.
- The generated JWK/PEM are kept under `packages/supabase/out/` (gitignored).