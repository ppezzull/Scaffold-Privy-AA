// Shared, environment-safe JWT payload decoder without verification.
// Uses base64url decoding and falls back to Buffer when atob is unavailable.

export function decodeJwtUnsafe(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadB64Url = parts[1] || "";
    if (!payloadB64Url) return null;

    // Convert base64url -> base64 and pad
    const b64 = payloadB64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4 || 4)) % 4);

    let json: string;
    if (typeof atob === "function") {
      json = atob(padded);
    } else if (typeof Buffer !== "undefined") {
      json = Buffer.from(padded, "base64").toString("utf8");
    } else {
      return null;
    }
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
