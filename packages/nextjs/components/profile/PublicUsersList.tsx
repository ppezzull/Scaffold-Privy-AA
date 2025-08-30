import React from "react";
import { type UserRow } from "../../utils/actions/profile";

export function PublicUsersList({ users }: { users: UserRow[] }) {
  return (
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Public directory (RLS: public select only)</p>
      <div className="divide-y divide-gray-200 dark:divide-gray-800 rounded border border-gray-200 dark:border-gray-800">
        {users.map(u => (
          <div key={u.id} className="p-3 flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-mono text-xs text-gray-500">{u.id}</div>
              <div className="text-sm">{[u.name, u.surname].filter(Boolean).join(" ") || "—"}</div>
            </div>
            <div className="text-xs text-gray-500">{new Date(u.created_at).toLocaleString()}</div>
          </div>
        ))}
        {users.length === 0 && <div className="p-3 text-sm text-gray-500">No users yet.</div>}
      </div>
    </div>
  );
}
