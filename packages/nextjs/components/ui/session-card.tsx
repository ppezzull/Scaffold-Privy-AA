"use client";

import React from "react";
import { Badge } from "./badge";
import { CodeBlock } from "./codeblock";
import { Skeleton } from "./skeleton";

type Props = {
  title: string;
  subtitle?: string;
  loading?: boolean;
  state?: "connected" | "notConnected" | "unavailable";
  labels?: { loading?: string; connected?: string; notConnected?: string };
  connectedContent?: React.ReactNode;
  connectedCode?: { data?: any; label?: string };
  notConnectedContent?: React.ReactNode | string;
};

export function SessionCard({
  title,
  subtitle,
  loading = false,
  state = "notConnected",
  labels,
  connectedContent,
  connectedCode,
  notConnectedContent,
}: Props) {
  // default labels exposed so callers can reuse/override them
  const DEFAULT_SESSION_LABELS = { loading: "Loading…", connected: "Connected", notConnected: "Not connected" };
  const appliedLabels = { ...DEFAULT_SESSION_LABELS, ...(labels ?? {}) };
  const loadingLabel = appliedLabels.loading;
  const connectedLabel = appliedLabels.connected;
  const notConnectedLabel = appliedLabels.notConnected;

  const badge = loading ? (
    <Badge variant="secondary">{loadingLabel}</Badge>
  ) : state === "connected" ? (
    <Badge variant="primary">{connectedLabel}</Badge>
  ) : (
    <Badge variant="outline">{notConnectedLabel}</Badge>
  );

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">{subtitle}</div>
          {badge}
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        ) : state === "connected" ? (
          connectedCode ? (
            <div className="space-y-3">
              <CodeBlock data={connectedCode.data} label={connectedCode.label} />
            </div>
          ) : (
            (connectedContent ?? null)
          )
        ) : typeof notConnectedContent === "string" ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">{notConnectedContent}</div>
        ) : (
          (notConnectedContent ?? <div className="text-sm text-gray-500 dark:text-gray-400">Not available.</div>)
        )}
      </div>
    </section>
  );
}

export default SessionCard;
