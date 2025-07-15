// components/PrivyConnector.tsx
import React from "react";
import { useConnectOrCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";

export function HeaderConnectButton() {
  // Privy auth state and actions
  const { ready, authenticated, logout, user } = usePrivy();
  const { wallets } = useWallets();

  // Wallet connect method with callbacks for embedded AA wallets
  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: wallet => {
      console.log("Smart Account wallet connected successfully", wallet);
    },
    onError: err => {
      console.error("Wallet connection failed", err);
    },
  });

  // Show loading state while SDK initializes
  if (!ready) {
    return (
      <button disabled className="btn btn-primary btn-sm">
        Loading…
      </button>
    );
  }

  // If authenticated, show user info and disconnect option
  if (authenticated) {
    const embeddedWallet = wallets.find(wallet => wallet.walletClientType === "privy");
    const isEmbeddedWallet = !!embeddedWallet;

    return (
      <div className="flex items-center gap-2">
        <div className="text-sm">
          {user?.email?.address || user?.phone?.number || "Connected"}
          {isEmbeddedWallet && <span className="ml-1 text-xs text-green-600">(Smart Account)</span>}
        </div>
        <button onClick={logout} className="btn btn-outline btn-sm">
          Disconnect
        </button>
      </div>
    );
  }

  // Show connect button for unauthenticated users
  return (
    <button onClick={connectOrCreateWallet} className="btn btn-primary btn-sm">
      Connect Smart Wallet
    </button>
  );
}
