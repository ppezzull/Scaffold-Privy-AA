# 🏗 Scaffold-Privy-AA

<h4 align="center">
  <a href="https://docs.scaffoldeth.io">Scaffold Documentation</a> |
  <a href="https://privy.io">Privy</a>
</h4>

🧪 An open-source, up-to-date toolkit for building decentralized applications (dapps) on the Ethereum blockchain with seamless onboarding through Privy's social login and account abstraction. It's designed to make it easier for developers to create and deploy smart contracts and build user interfaces that interact with those contracts without requiring users to have a traditional wallet or understand blockchain complexities.

> This template was developed for the napulETH Hackathon 2025: https://taikai.network/napulETH/hackathons/napuleth2025

⚙️ Built using NextJS, Privy, Foundry, Wagmi, Viem, and Typescript.

- ✅ **Contract Hot Reload**: Your frontend auto-adapts to your smart contract as you edit it.
- 🪝 **[Custom hooks](https://docs.scaffoldeth.io/hooks/)**: Collection of React hooks wrapper around [wagmi](https://wagmi.sh/) to simplify interactions with smart contracts with typescript autocompletion.
- 🧱 [**Components**](https://docs.scaffoldeth.io/components/): Collection of common web3 components to quickly build your frontend.
- � **Social Login with Privy**: Allow users to log in with email, Google, Discord, Telegram and other social accounts.
- 🔐 **Account Abstraction**: Privy assigns users a smart wallet they can access with social login or connect their pre-existing wallet.
- 🔐 **Integration with Traditional Wallets**: Connect to Coinbase Wallet, MetaMask, and other wallet providers.

![Debug Contracts tab](https://github.com/scaffold-eth/scaffold-eth-2/assets/55535804/b237af0c-5027-4849-a5c1-2e31495cccb1)

## Known Issues

**React `isActive` prop warning**

There's a console warning that appears when executing transactions:

```
React does not recognize the `isActive` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `isactive` instead. If you accidentally passed it from a parent component, remove it from the DOM element.

components/ScaffoldEthAppWithProviders.tsx (40:5) @ ScaffoldEthAppWithProviders
```

This is related to the Privy Provider implementation. While not breaking functionality, community contributions to fix this issue are welcome!

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

To get started with Scaffold-Privy-AA, follow the steps below:

1. Install dependencies if it was skipped in CLI:

```
git clone https://github.com/ppezzull/Scaffold-Privy-AA
cd Scaffold-Privy-AA
yarn install
```

2. Set up your environment variables:
   - In the `packages/nextjs` directory, copy `.env.example` to `.env.local`
   - Get an Alchemy API key from [alchemy.com](https://www.alchemy.com/)
   - Create a Privy account at [console.privy.io](https://console.privy.io)
   - Create a new project and obtain your Privy project ID
   - Add both keys to the `.env.local` file
   - In the Privy dashboard (https://dashboard.privy.io/apps/[YOUR-PROJECT-ID]/login-methods), enable Ethereum wallets

3. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Ethereum network using Foundry. The network runs on your local machine and can be used for testing and development. You can customize the network configuration in `packages/foundry/foundry.toml`.

4. On a second terminal, deploy the test contract:

```
yarn deploy
```

This command deploys a test smart contract to the local network. The contract is located in `packages/foundry/contracts` and can be modified to suit your needs. The `yarn deploy` command uses the deploy script located in `packages/foundry/script` to deploy the contract to the network. You can also customize the deploy script.

5. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contract using the `Debug Contracts` page. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

**Important**: Make sure to set up both your Alchemy API key and Privy project ID in the `.env.local` file. The Alchemy API key is required to access Ethereum networks, and the Privy project ID is needed for social login functionality. Without these, your dApp will not work properly.

Run smart contract test with `yarn foundry:test`

- Edit your smart contracts in `packages/foundry/contracts`
- Edit your frontend homepage at `packages/nextjs/app/page.tsx`. For guidance on [routing](https://nextjs.org/docs/app/building-your-application/routing/defining-routes) and configuring [pages/layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts) checkout the Next.js documentation.
- Edit your deployment scripts in `packages/foundry/script`
- Customize your Privy configuration in `components/PrivyConnector.tsx`


## Documentation

Visit [Scaffold-ETH 2 docs](https://docs.scaffoldeth.io) to learn about the base framework.

For Privy integration, check out the [Privy documentation](https://docs.privy.io/) to understand how to customize the social login and wallet experience.

## Setting up Environment Variables

1. In the `packages/nextjs` directory, copy `.env.example` to `.env.local` and add your API keys:
   ```
   # Required for accessing Ethereum networks
   NEXT_PUBLIC_ALCHEMY_API_KEY=your-alchemy-api-key-here
   
   # Required for Privy social login and wallet features
   NEXT_PUBLIC_PRIVY_APP_ID=your-privy-project-id-here
   ```

2. To get these keys:
   - For Alchemy: Sign up at [alchemy.com](https://www.alchemy.com/) and create a new API key
   - For Privy: Create an account at [console.privy.io](https://console.privy.io) and create a new project
3. In the Privy dashboard (https://dashboard.privy.io/apps/[YOUR-PROJECT-ID]/login-methods), enable the login methods you want to support:
   - Make sure "Ethereum wallets" is enabled to support MetaMask, Coinbase Wallet, etc.
   - Enable social login methods like Google, Discord, Email, etc.
4. Configure additional customization in `components/PrivyConnector.tsx`

## How Privy Works in this Project

Privy provides users with a smart wallet that they can access through:
1. Social login (Google, Discord, email, etc.)
2. Connecting an existing wallet (MetaMask, Coinbase Wallet, etc.)

When a user logs in with a social account, they are assigned a wallet that remains consistent across sessions. This wallet can be used to sign transactions and interact with your dApp's smart contracts seamlessly.

## Contributing to Scaffold-Privy-AA

We welcome contributions to Scaffold-Privy-AA!

Please see [CONTRIBUTING.MD](CONTRIBUTING.md) for more information and guidelines for contributing to Scaffold-Privy-AA.
