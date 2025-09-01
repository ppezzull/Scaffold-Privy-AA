# 🏗 Scaffold-Privy-AA

[![docs](https://img.shields.io/badge/Scaffold-Docs-blue)](https://docs.scaffoldeth.io)
[![privy](https://img.shields.io/badge/Privy-privy.io-9cf)](https://privy.io)
[![shadcn](https://img.shields.io/badge/Shadcn-shadcn%2Fui-purple)](https://ui.shadcn.com)
[![foundry](https://img.shields.io/badge/Foundry-getfoundry.sh-ff7f50)](https://getfoundry.sh)
[![nextjs](https://img.shields.io/badge/Next.js-nextjs.org-black)](https://nextjs.org)
[![supabase](https://img.shields.io/badge/Supabase-supabase.io-3ECF8E)](https://supabase.com)

🧪 An open-source, up-to-date toolkit for building decentralized applications (dapps) on the Ethereum blockchain with seamless onboarding through Privy's social login and account abstraction. It's designed to make it easier for developers to create and deploy smart contracts and build user interfaces that interact with those contracts without requiring users to have a traditional wallet or understand blockchain complexities.


⚙️ Built using NextJS, Shadcn, Privy, Foundry, Supabase, Wagmi, Viem, and Typescript.

- ✅ **Contract Hot Reload**: Your frontend auto-adapts to your smart contract as you edit it.
- 🪝 **[Custom hooks](https://docs.scaffoldeth.io/hooks/)**: Collection of React hooks wrapping [wagmi](https://wagmi.sh/) to simplify interactions with smart contracts with TypeScript autocompletion.
- 🧱 **Components**: Collection of common web3 components to quickly build your frontend.
- 🎨 **shadcn UI**: Prebuilt, customizable UI components and design patterns using [shadcn/ui](https://ui.shadcn.com) (Tailwind + Radix) to speed up building consistent, accessible interfaces.
- 👥 **Social Login with Privy**: Allow users to log in with email, Google, Discord, Telegram and other social accounts.
- 🪙 **Account Abstraction**: Privy assigns users a smart wallet they can access via social login or by connecting an existing wallet.
- 🔗 **Integration with Traditional Wallets**: Connect to Coinbase Wallet, MetaMask, and other wallet providers.
 - 🔐 **Supabase token exchange**: A server-side action verifies the Privy JWT and mints a short-lived Supabase-signed JWT used by the client for RLS-protected requests.
 


![Debug Contracts tab](https://i.postimg.cc/fR1w3vr8/Screenshot-From-2025-09-01-16-23-39.png)

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)
 - [Supabase (project & CLI)](https://supabase.com/docs/guides/cli)

## Quickstart

Follow these steps to get up and running fast.

1) Install dependencies:

```
git clone https://github.com/ppezzull/Scaffold-Privy-AA
cd Scaffold-Privy-AA
yarn install
```

2) Common prerequisites (used by both Local and Production):
    - Alchemy: Create an API key at https://www.alchemy.com/ (optional for local, required if you’ll hit public networks). Set `NEXT_PUBLIC_ALCHEMY_API_KEY` in `packages/nextjs/.env.local` when needed.
    - Privy: Create a project at https://console.privy.io and copy your App ID into `NEXT_PUBLIC_PRIVY_APP_ID`.
       - In the Privy Dashboard (Apps → Login methods), enable the login methods you want: Ethereum wallets, Google, Discord, Email, etc.
       - You can customize behavior in `packages/nextjs/components/PrivyConnector.tsx`.

3) Choose your environment

### Local development

Environment and Supabase
- In `packages/nextjs`, copy `.env.example` to `.env.local` and uncomment the “Local Development — Supabase CLI (HS256)” section.
- Ensure `packages/supabase/config.toml` is in HS256 mode (no `signing_keys_path`).
- Fill `NEXT_PUBLIC_PRIVY_APP_ID`; add `NEXT_PUBLIC_ALCHEMY_API_KEY` only if you plan to use public networks.

Run (in separate terminals)
```
yarn supabase:start
yarn chain
yarn start
yarn deploy
```

Notes
- Visit the app at http://localhost:3000
- The local Ethereum node is configured in `packages/foundry/foundry.toml`.
- Contracts live in `packages/foundry/contracts`; deploy scripts in `packages/foundry/script`.

### Production / Hosted

Environment
- In `packages/nextjs`, copy `.env.example` to `.env.local` and uncomment the “Production/Hosted — Supabase (ES256/RS256 with JWKS)” section.
- From Supabase Dashboard → Settings → API, fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

JWT signing (ES256 with JWKS)
```
yarn supabase:keygen
```
- Add the generated JWK in Supabase Dashboard → Settings → JWT → Signing Keys.
- Update the `kid` in `packages/supabase/out/signing_key.json` to the one shown in Supabase.
```
yarn supabase:jwk-to-pem
```
- Optional: verify JWKS at `https://<PROJECT_ID>.supabase.co/auth/v1/keys` (the `kid` must match).

Run (in separate terminals)
```
yarn chain
yarn start
yarn deploy
```

Important
- Use `.env.local` for both local and production setups. Never commit real secrets; for hosting, configure platform environment variables.


## Documentation

- Visit [Scaffold-ETH 2 docs](https://docs.scaffoldeth.io) to learn about the base framework.
- For Privy integration, see the [Privy documentation](https://docs.privy.io/) to customize social login and embedded wallets.
- For Supabase-specific guidance (auth, JWT signing keys, RLS), see the [Supabase docs](https://supabase.com/docs) and the [JWT Signing Keys guide](https://supabase.com/docs/guides/auth/signing-keys).

## How Privy Works with Supabase in this Project 

Short version:
- Users authenticate with Privy (social + wallets). The client sends the Privy access token to a Server Action.
- The Server Action verifies the Privy JWT against Privy’s JWKS, maps/creates a local user in Supabase, and mints a short‑lived Supabase‑signed JWT with sub=<users.id> and role=authenticated.
- The JWT is stored in an HttpOnly cookie for SSR and also provided to the browser Supabase client via an accessToken callback for RLS‑protected queries.

Details and snippets: see [rules/supabase-privy.md](./rules/supabase-privy.md)

## Contributing to Scaffold-Privy-AA

We welcome contributions to Scaffold-Privy-AA!

Please see [CONTRIBUTING.MD](CONTRIBUTING.md) for more information and guidelines for contributing to Scaffold-Privy-AA.
