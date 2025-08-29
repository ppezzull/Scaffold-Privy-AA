"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSupabaseSession } from "../providers/SupabaseProvider";
import { usePrivy } from "@privy-io/react-auth";
import { getSupabaseAccessToken } from "~~/utils/supabase/token-cache";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-neutral-900 shadow-sm">
        {children}
      </div>
    </section>
  );
}

function Badge({ color, children }: { color: "green" | "yellow" | "red" | "gray"; children: React.ReactNode }) {
  const map = {
    green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
  } as const;
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${map[color]}`}>
      {children}
    </span>
  );
}

function CodeBlock({ data, label, compact }: { data: unknown; label?: string; compact?: boolean }) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <div className="space-y-2">
      {label ? <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div> : null}
      <pre
        className={`relative rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-neutral-950 overflow-x-auto ${compact ? "p-2 text-xs" : "p-4 text-sm"}`}
      >
        <code className="whitespace-pre">{text}</code>
      </pre>
    </div>
  );
}

function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse" />
      ))}
    </div>
  );
}

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

function PrivyCard() {
  const { ready, authenticated, user } = usePrivy();
  const summary = useMemo(() => summarizePrivyUser(user), [user]);

  return (
    <Section title="Privy">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600 dark:text-gray-300">Authentication state</div>
        {!ready ? (
          <Badge color="yellow">Loading…</Badge>
        ) : authenticated ? (
          <Badge color="green">Connected</Badge>
        ) : (
          <Badge color="red">Not connected</Badge>
        )}
      </div>
      {!ready ? (
        <Skeleton lines={4} />
      ) : authenticated ? (
        <CodeBlock data={summary} label="Privy user" />
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">No Privy session. Please sign in.</div>
      )}
    </Section>
  );
}

function SupabaseClientCard() {
  const { claims: ctxClaims, loading: ctxLoading } = useSupabaseSession();

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = await getSupabaseAccessToken();
        if (!mounted) return;
        setToken(t);
        setClaims(decodeJwtUnsafe(t));
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
  const connected = Boolean((token || ctxClaims) && finalClaims);

  return (
    <Section title="Supabase (Client Token)">
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

export default function ClientCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <PrivyCard />
      <SupabaseClientCard />
    </div>
  );
}
