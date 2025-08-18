// components/PrivyConnector.tsx
import React from "react";
import { useConnectOrCreateWallet, usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export function HeaderConnectButton() {
  // Privy auth state and actions
  const { ready, authenticated, logout, user } = usePrivy();
  const { address } = useAccount();

  // Wallet connect method with callbacks for embedded AA wallets
  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    // onSuccess: wallet => {
    // console.log("Smart Account wallet connected successfully", wallet);
    // },
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
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm">
          {user?.email?.address ? user?.email?.address : address?.slice(0, 6) + "..." + address?.slice(-4)}
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
