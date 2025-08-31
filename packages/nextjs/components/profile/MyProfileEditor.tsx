"use client";

import React, { useState, useTransition } from "react";
import { type UserRow, updateMeAction } from "../../utils/actions/profile";

export function MyProfileEditor({ me: initial }: { me: UserRow | null }) {
  const [me, setMe] = useState<UserRow | null>(initial);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; error?: string | null } | null>(null);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Your profile (RLS: owner-only update)</p>
      <div className="space-y-3">
        <div className="text-xs font-mono break-all">{me?.id}</div>
        <form
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          action={formData => {
            startTransition(async () => {
              try {
                const nameRaw = (formData.get("name") as string) ?? "";
                const surnameRaw = (formData.get("surname") as string) ?? "";
                const data = await updateMeAction({
                  name: nameRaw.trim() || null,
                  surname: surnameRaw.trim() || null,
                });
                setMe(data);
                setState({ ok: true });
              } catch (e: any) {
                setState({ ok: false, error: e?.message ?? "Update failed" });
              }
            });
          }}
        >
          <label className="block">
            <span className="text-xs text-gray-500">Name</span>
            <input
              name="name"
              defaultValue={me?.name ?? ""}
              className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Surname</span>
            <input
              name="surname"
              defaultValue={me?.surname ?? ""}
              className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <div className="sm:col-span-2">
            <button disabled={isPending} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
          {state && !state.ok && state.error && <div className="sm:col-span-2 text-sm text-red-600">{state.error}</div>}
        </form>
      </div>
    </div>
  );
}
