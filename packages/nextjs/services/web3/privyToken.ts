"use client";

// Using the top-level getAccessToken if available; otherwise, consumers can use the hook variant.
// Some versions of @privy-io/react-auth export getAccessToken directly.
import { getAccessToken, usePrivy } from "@privy-io/react-auth";

export async function getPrivyToken(): Promise<string | null> {
  try {
    // @ts-ignore - getAccessToken may be undefined in some SDK versions
    const token = await getAccessToken?.();
    return token ?? null;
  } catch {
    return null;
  }
}

export function usePrivyAccessToken() {
  const { authenticated, getAccessToken: hookGetAccessToken, user, ready } = usePrivy();
  const read = async () => (authenticated ? await hookGetAccessToken() : null);
  return { user, ready, authenticated, read };
}
