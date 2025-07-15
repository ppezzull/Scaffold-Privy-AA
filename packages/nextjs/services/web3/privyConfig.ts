// privyConfig.ts
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { hardhat } from "viem/chains";

export const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    createOnLogin: "users-without-wallets",
    showWalletUIs: true,
  },
  loginMethods: ["wallet", "email", "sms", "google"],
  appearance: {
    showWalletLoginFirst: true,
  },
  defaultChain: hardhat,
  supportedChains: [hardhat],
};
