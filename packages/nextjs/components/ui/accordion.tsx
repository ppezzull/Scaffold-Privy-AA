"use client";

import * as React from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { cn } from "~~/lib/utils";

export function Accordion({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-border bg-card", className)}>{children}</div>;
}

export function AccordionItem({
  className,
  children,
  open: openProp,
}: {
  className?: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  const [open, setOpen] = React.useState(!!openProp);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className={cn("w-full", className)}>
      {children}
    </Collapsible.Root>
  );
}

export function AccordionTrigger({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Collapsible.Trigger
      className={cn(
        "w-full text-left px-4 py-2 flex items-center justify-between gap-2 rounded-t-xl",
        "text-sm text-foreground/70 hover:text-foreground",
        className,
      )}
    >
      {children}
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="size-4 shrink-0 data-[state=open]:rotate-180 transition-transform"
      >
        <path fill="currentColor" d="M10 12l-4-4h8l-4 4z" />
      </svg>
    </Collapsible.Trigger>
  );
}

export function AccordionContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <Collapsible.Content className={cn("px-4 pb-3", className)}>{children}</Collapsible.Content>;
}
