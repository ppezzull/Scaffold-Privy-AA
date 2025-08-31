"use client";

import React, { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import SessionCard from "~~/components/ui/session-card";

function summarizePrivyUser(u: any) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email?.address ?? null,
    wallet: u.wallet?.address ?? null,
    linkedAccounts: (u.linkedAccounts || []).map((a: any) => ({
      type: a.type,
      address: a.address ?? null,
      id: a.id ?? null,
    })),
  };
}

export function PrivySessionCard() {
  const { ready, authenticated, user } = usePrivy();
  const summary = useMemo(() => summarizePrivyUser(user), [user]);

  return (
    <SessionCard
      title="Privy"
      subtitle="Authentication state"
      loading={!ready}
      state={authenticated ? "connected" : "notConnected"}
      connectedCode={{ data: summary, label: "Privy user" }}
      notConnectedContent="No Privy session. Please sign in."
    />
  );
}
