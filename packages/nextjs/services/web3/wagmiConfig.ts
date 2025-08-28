import { coinbaseWallet, injected, walletConnect } from "@wagmi/connectors";
import { createConfig, http } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: scaffoldConfig.targetNetworks,
  transports: scaffoldConfig.targetNetworks.reduce(
    (acc, chain) => {
      return { ...acc, [chain.id]: http() };
    },
    {} as Record<number, ReturnType<typeof http>>,
  ),
  connectors: [
    // Ensure Privy-connected wallets are recognized by wagmi
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
    coinbaseWallet({ appName: "zkMed" }),
  ],
  ssr: true,
});
