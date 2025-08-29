"use client";

import React, { useEffect, useState } from "react";
import { useSupabaseSession } from "../providers/SupabaseProvider";
import { Badge, CodeBlock, Section, Skeleton } from "./PrivySessionCard";
import { getSupabaseAccessToken } from "~~/utils/supabase/token-cache";

function decodeJwtUnsafe(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function SupabaseSessionCard() {
  const { claims: ctxClaims, loading: ctxLoading } = useSupabaseSession();

  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getSupabaseAccessToken();
        if (!mounted) return;
        setClaims(decodeJwtUnsafe(token));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const finalLoading = ctxLoading || loading;
  const finalClaims = ctxClaims ?? claims;
  const connected = Boolean(finalClaims);

  return (
    <Section title="Supabase">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600 dark:text-gray-300">Custom JWT for RLS</div>
        {finalLoading ? (
          <Badge color="yellow">Loading…</Badge>
        ) : connected ? (
          <Badge color="green">Ready</Badge>
        ) : (
          <Badge color="red">Unavailable</Badge>
        )}
      </div>
      {finalLoading ? (
        <Skeleton lines={4} />
      ) : connected ? (
        <div className="space-y-3">
          <CodeBlock data={finalClaims} label="JWT claims" />
        </div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">No client token yet. Log in to generate one.</div>
      )}
    </Section>
  );
}
