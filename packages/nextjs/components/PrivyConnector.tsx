// components/HeaderConnectButton.tsx
import React from "react";
import { useConnectOrCreateWallet, usePrivy } from "@privy-io/react-auth";

export function HeaderConnectButton() {
  // Privy auth state and actions
  const { ready, authenticated, logout } = usePrivy();
  // Wallet connect method with callbacks
  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: () => console.log("Wallet connected successfully"),
    onError: err => console.error("Wallet connection failed", err),
  });

  // Disable button until SDK is ready
  if (!ready) {
    return <button disabled>Loading…</button>;
  }

  // Show "Logout" if already connected, else "Connect Wallet"
  return authenticated ? (
    <button onClick={logout}>Disconnect Wallet</button>
  ) : (
    <button onClick={connectOrCreateWallet}>Connect Wallet</button>
  );
}
