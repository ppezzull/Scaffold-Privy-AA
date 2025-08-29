"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseSession } from "../providers/SupabaseProvider";
import { Badge, CodeBlock, Section, Skeleton } from "./PrivySessionCard";

export function SupabaseSessionCard() {
  const { client, loading: providerLoading, refresh } = useSupabaseSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRow, setUserRow] = useState<Record<string, unknown> | null>(null);

  const fetchUser = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await client.from("users").select("*").limit(1).single();
      if (error) {
        setUserRow(null);
        setError(error.message);
      } else {
        setUserRow(data ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!client || providerLoading) return;
    void fetchUser();
  }, [client, providerLoading, fetchUser]);

  const status = useMemo(() => {
    if (providerLoading || loading) return { color: "yellow", text: "Loading…" } as const;
    if (userRow) return { color: "green", text: "Ready" } as const;
    return { color: "red", text: "Unavailable" } as const;
  }, [providerLoading, loading, userRow]);

  return (
    <Section title="Supabase">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600 dark:text-gray-300">User session (via RLS)</div>
        <Badge color={status.color}>{status.text}</Badge>
      </div>
      {providerLoading || loading ? (
        <Skeleton lines={4} />
      ) : userRow ? (
        <div className="space-y-3">
          <CodeBlock data={userRow} label="users row" />
          <div className="flex gap-2">
            <button
              className="rounded bg-secondary px-3 py-1 text-sm"
              onClick={async () => {
                await refresh();
                await fetchUser();
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {error ? `Error: ${error}` : "No session data. Log in to generate one."}
        </div>
      )}
    </Section>
  );
}
