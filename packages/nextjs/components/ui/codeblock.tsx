"use client";

import React from "react";

export function CodeBlock({ data, label, compact }: { data: unknown; label?: string; compact?: boolean }) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <div className="space-y-2">
      {label ? <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div> : null}
      <pre
        className={`relative rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-neutral-950 overflow-x-auto ${compact ? "p-2 text-xs" : "p-4 text-sm"}`}
      >
        <code className="whitespace-pre">{text}</code>
      </pre>
    </div>
  );
}
