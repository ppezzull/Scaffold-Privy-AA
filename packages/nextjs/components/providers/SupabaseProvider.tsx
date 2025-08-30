"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { clearSupabaseTokenCache, getSupabaseAccessToken } from "~~/services/store/token-cache";
import { createClient as createBrowserSupabase } from "~~/utils/supabase/client";

type Ctx = {
  client: ReturnType<typeof createBrowserSupabase> | null;
  claims: Record<string, unknown> | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SupabaseCtx = createContext<Ctx>({ client: null, claims: null, loading: true, refresh: async () => {} });

function decodeJwt(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, ready } = usePrivy();
  const [client] = useState(() => createBrowserSupabase());
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useMemo(
    () =>
      async function refresh() {
        setLoading(true);
        try {
          const token = await getSupabaseAccessToken();
          setClaims(decodeJwt(token));
        } finally {
          setLoading(false);
        }
      },
    [],
  );

  useEffect(() => {
    if (!ready) return;
    if (authenticated) {
      void refresh();
    } else {
      clearSupabaseTokenCache();
      setClaims(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, ready]);

  const value = useMemo<Ctx>(() => ({ client, claims, loading, refresh }), [client, claims, loading, refresh]);
  return <SupabaseCtx.Provider value={value}>{children}</SupabaseCtx.Provider>;
}

export function useSupabaseSession() {
  return useContext(SupabaseCtx);
}
