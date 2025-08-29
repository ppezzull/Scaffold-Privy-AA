"use client";

import { exchangePrivyToken } from "../../utils/actions/auth";
import { getPrivyToken } from "../web3/privyToken";

let cached: { token: string; exp: number } | null = null;

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (cached && cached.exp - 30 > nowSec()) {
    return cached.token;
  }

  const privyToken = await getPrivyToken();
  if (!privyToken) return null;

  const supaToken = await exchangePrivyToken(privyToken);
  try {
    const payload = JSON.parse(atob(supaToken.split(".")[1] ?? ""));
    cached = { token: supaToken, exp: payload.exp ?? nowSec() + 60 * 10 };
  } catch {
    cached = { token: supaToken, exp: nowSec() + 60 * 10 };
  }
  return supaToken;
}

export function clearSupabaseTokenCache() {
  cached = null;
}
