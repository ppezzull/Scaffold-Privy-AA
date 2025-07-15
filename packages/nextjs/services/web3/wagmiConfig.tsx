import { createConfig } from "@privy-io/wagmi";
import { Chain, http } from "viem";
import { mainnet } from "viem/chains";
import scaffoldConfig from "~~/scaffold.config";

const { targetNetworks } = scaffoldConfig;

// Always include Mainnet for ENS, price, etc.
export const enabledChains = targetNetworks.some((c: Chain) => c.id === 1)
  ? targetNetworks
  : ([...targetNetworks, mainnet] as const);

export const wagmiConfig = createConfig({
  chains: enabledChains,
  transports: {
    [enabledChains[0].id]: http(),
    [enabledChains[1].id]: http(),
  },
});
