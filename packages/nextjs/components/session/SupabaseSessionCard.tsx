"use client";

import React from "react";
import { useSupabaseSession } from "../providers/SupabaseProvider";
import SessionCard from "~~/components/ui/session-card";

export function SupabaseSessionCard({ initialClaims }: { initialClaims?: Record<string, unknown> | null }) {
  const { claims: ctxClaims, loading: ctxLoading } = useSupabaseSession();
  // Only show loading if we expect claims to arrive; otherwise render as unavailable
  const finalLoading = Boolean(ctxLoading && (ctxClaims != null || initialClaims != null));
  const finalClaims = ctxClaims ?? initialClaims;
  const connected = Boolean(finalClaims);

  return (
    <SessionCard
      title="Supabase"
      subtitle="Custom JWT for RLS"
      loading={finalLoading}
      state={connected ? "connected" : "unavailable"}
      connectedCode={{ data: finalClaims, label: "JWT claims" }}
      notConnectedContent="No client token yet. Log in to generate one."
    />
  );
}
