import React from "react";
import { cookies } from "next/headers";
import { MyProfileEditor } from "../../components/profile/MyProfileEditor";
import { PublicUsersList } from "../../components/profile/PublicUsersList";
import { fetchMeAction, fetchPublicUsersAction } from "../../utils/actions/profile";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value || null;

  if (!token) {
    const users = await fetchPublicUsersAction();
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Profiles</h1>
        <PublicUsersList users={users} />
      </div>
    );
  }

  try {
    const me = await fetchMeAction(token);
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Profiles</h1>
        <MyProfileEditor me={me} />
      </div>
    );
  } catch (e: any) {
    const message: string = e?.message ?? "Unknown error";
    const users = await fetchPublicUsersAction();
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Profiles</h1>
        <div className="text-sm text-red-600">{message}</div>
        <PublicUsersList users={users} />
      </div>
    );
  }
}
