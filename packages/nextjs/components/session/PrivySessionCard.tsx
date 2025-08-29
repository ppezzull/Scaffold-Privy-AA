"use client";

import React, { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-neutral-900 shadow-sm">
        {children}
      </div>
    </section>
  );
}

export function Badge({ color, children }: { color: "green" | "yellow" | "red" | "gray"; children: React.ReactNode }) {
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

export function CodeBlock({ data, label }: { data: unknown; label?: string }) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <div className="space-y-2">
      {label ? <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div> : null}
      <pre className="relative rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-neutral-950 overflow-x-auto p-4 text-sm">
        <code className="whitespace-pre">{text}</code>
      </pre>
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
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

export function PrivySessionCard() {
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
