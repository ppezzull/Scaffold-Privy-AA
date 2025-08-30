"use client";

import { getPrivyToken } from "../../services/web3/privyToken";
import { exchangePrivyToken } from "~~/utils/actions/auth";

let cached: { token: string; exp: number } | null = null;
const LS_KEY = "sb_exch";

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  // If we don't have a fresh in-memory token, try to hydrate from localStorage
  if (!cached && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { token: string; exp: number };
        if (parsed?.token && parsed?.exp && parsed.exp - 30 > nowSec()) {
          cached = parsed;
        }
      }
    } catch {}
  }

  if (cached && cached.exp - 30 > nowSec()) return cached.token;

  const privyToken = await getPrivyToken();
  if (!privyToken) return null;

  const supaToken = await exchangePrivyToken(privyToken);
  try {
    const payload = JSON.parse(atob(supaToken.split(".")[1] ?? ""));
    cached = { token: supaToken, exp: payload.exp ?? nowSec() + 60 * 10 };
  } catch {
    cached = { token: supaToken, exp: nowSec() + 60 * 10 };
  }
  // Persist for reuse across HMR/reloads
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(LS_KEY, JSON.stringify(cached));
  } catch {}
  return supaToken;
}

export function clearSupabaseTokenCache() {
  cached = null;
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(LS_KEY);
  } catch {}
}
