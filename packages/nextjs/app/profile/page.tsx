import React from "react";
import { MyProfileEditor } from "../../components/profile/MyProfileEditor";
import { PublicUsersList } from "../../components/profile/PublicUsersList";
import { fetchMeAction, fetchPublicUsersAction } from "../../utils/actions/profile";

export default async function ProfilePage() {
  const [users, me] = await Promise.all([fetchPublicUsersAction(), fetchMeAction()]);
  const error = null;

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
