"use client";

import { Button } from "../../ui/button";
import { Balance } from "../Balance";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { AddressQRCodeModal } from "./AddressQRCodeModal";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { useConnectOrCreateWallet, useConnectWallet, usePrivy } from "@privy-io/react-auth";
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
  const { connectWallet } = useConnectWallet({
    onError: err => console.error("Wallet reconnect failed", err),
  });

  const blockExplorerAddressLink = address ? getBlockExplorerAddressLink(targetNetwork, address) : undefined;

  if (!ready) {
    return (
      <Button disabled size="sm" className="rounded-full font-bold">
        Loading…
      </Button>
    );
  }

  if (!isConnected || !address || !chain) {
    return (
      <Button
        size="sm"
        className="rounded-full font-bold cursor-pointer hover:brightness-90 active:brightness-75 transition duration-150"
        onClick={() => {
          if (!authenticated) {
            connectOrCreateWallet();
          } else {
            connectWallet();
          }
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
      <AddressQRCodeModal address={address as Address} modalId="qrcode-modal" />
    </>
  );
};
