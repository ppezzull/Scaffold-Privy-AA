import React from "react";
import { PrivySessionCard } from "../../components/session/PrivySessionCard";
import { SupabaseSessionCard } from "../../components/session/SupabaseSessionCard";

export default function SessionPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Sessions</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PrivySessionCard />
        <SupabaseSessionCard />
      </div>
    </div>
  );
}
