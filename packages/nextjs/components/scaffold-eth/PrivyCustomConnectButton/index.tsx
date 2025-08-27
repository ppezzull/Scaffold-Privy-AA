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

  if (!authenticated || !isConnected || !address || !chain) {
    return (
      <Button
        size="sm"
        className="rounded-full font-bold cursor-pointer hover:brightness-90 active:brightness-75 transition duration-150"
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
