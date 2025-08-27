import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "~~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border text-xs font-medium transition-colors focus:outline-none focus:ring-1 px-2 py-0.5",
  {
    variants: {
      variant: {
        default: "bg-[var(--muted)] text-[var(--muted-foreground)] border-transparent",
        primary: "bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent",
        secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)] border-transparent",
        outline: "bg-transparent text-foreground border-border",
      },
      size: {
        sm: "text-[10px] px-1.5 py-0",
        md: "text-xs px-2 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
