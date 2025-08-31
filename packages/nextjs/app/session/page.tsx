import React from "react";
import { cookies } from "next/headers";
import { PrivySessionCard } from "../../components/session/PrivySessionCard";
import { SupabaseSessionCard } from "../../components/session/SupabaseSessionCard";
import { decodeJwtUnsafe } from "../../lib/jwt";

export default async function SessionPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value || null;
  const initialClaims = decodeJwtUnsafe(token);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Sessions</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PrivySessionCard />
        <SupabaseSessionCard initialClaims={initialClaims} />
      </div>
    </div>
  );
}
