import React from "react";
import { type UserRow } from "../../utils/actions/profile";

export function PublicUsersList({ users }: { users: UserRow[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-300">Public directory (RLS: public select only)</p>
      {users.length === 0 ? (
        <div className="p-3 text-sm text-gray-500 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          No users yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map(u => (
            <div
              key={u.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2 bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="font-mono text-[10px] text-gray-500 break-all">{u.id}</div>
              <div className="text-sm font-medium">{[u.name, u.surname].filter(Boolean).join(" ") || "—"}</div>
              <div className="text-xs text-gray-500">{new Date(u.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
