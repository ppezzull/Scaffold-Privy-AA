import React from "react";
import { cookies } from "next/headers";
import { MyProfileEditor } from "../../components/profile/MyProfileEditor";
import { PublicUsersList } from "../../components/profile/PublicUsersList";
import { fetchMeAction, fetchPublicUsersAction } from "../../utils/actions/profile";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value || null;

  const [users, meOrError] = await Promise.all([
    fetchPublicUsersAction(),
    (async () => {
      if (!token) return { ok: true as const, me: null };
      try {
        const me = await fetchMeAction(token);
        return { ok: true as const, me };
      } catch (e: any) {
        return { ok: false as const, error: e?.message ?? "Unknown error" };
      }
    })(),
  ]);

  const me = meOrError.ok ? meOrError.me : null;
  const error = meOrError.ok ? null : meOrError.error;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="rounded-lg bg-secondary p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1">Profiles</h1>
        <p className="text-sm text-foreground/80">Manage your profile and browse the public users.</p>
      </div>
      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}
      {me ? <MyProfileEditor me={me} /> : null}
      <PublicUsersList users={users} />
    </div>
  );
}
