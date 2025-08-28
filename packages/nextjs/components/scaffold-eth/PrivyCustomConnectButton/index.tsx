"use client";

import { Button } from "../../ui/button";
import { Balance } from "../Balance";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { useConnectOrCreateWallet, usePrivy } from "@privy-io/react-auth";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { useNetworkColor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-eth";

export const PrivyCustomConnectButton = () => {
  const networkColor = useNetworkColor();
  const { targetNetwork } = useTargetNetwork();
  const { ready, authenticated } = usePrivy();
  const { address, chain, isConnected } = useAccount();

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onError: err => console.error("Wallet connection failed", err),
  });
  // keep behavior aligned with working branch: let the user initiate connect/create explicitly

  const blockExplorerAddressLink = address ? getBlockExplorerAddressLink(targetNetwork, address) : undefined;

  if (!ready) {
    return (
      <Button disabled size="sm" className="rounded-full font-bold">
        Loading…
      </Button>
    );
  }

  // Prevent flash: if Privy reports authenticated but wagmi isn't yet connected,
  // show a disabled 'Connecting…' state until wagmi finishes connecting.
  if (authenticated && !isConnected) {
    return (
      <Button disabled size="sm" className="rounded-full font-bold">
        Connecting…
      </Button>
    );
  }

  if (!authenticated || !isConnected || !address || !chain) {
    return (
      <Button
        size="sm"
        className="rounded-full font-bold cursor-pointer bg-[var(--color-base-300)] text-[var(--card-foreground)] border border-[var(--border)] shadow-sm hover:bg-[var(--color-base-200)]/90 active:scale-[0.98] transition"
        onClick={() => {
          connectOrCreateWallet();
        }}
        type="button"
      >
        Connect Smart Wallet
      </Button>
    );
  }

  if (!chain?.id || chain.id !== targetNetwork.id) {
    return <WrongNetworkDropdown />;
  }

  return (
    <>
      <div className="flex flex-col items-center mr-1">
        <Balance address={address as Address} className="min-h-0 h-auto" />
        <span className="text-xs" style={{ color: networkColor }}>
          {chain?.name}
        </span>
      </div>
      <AddressInfoDropdown
        address={address as Address}
        displayName={address}
        blockExplorerAddressLink={blockExplorerAddressLink}
      />
    </>
  );
};
