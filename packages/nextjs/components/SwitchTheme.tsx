"use client";

import { useEffect, useId, useState } from "react";
import { MoonIcon } from "lucide-react";
import { SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Label } from "~~/components/ui/label";
import { Switch } from "~~/components/ui/switch";

export const SwitchTheme = ({ className }: { className?: string }) => {
  const id = useId();
  const { setTheme, resolvedTheme } = useTheme();
  const [checked, setChecked] = useState<boolean>(resolvedTheme === "dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setChecked(resolvedTheme === "dark");
  }, [resolvedTheme]);

  if (!mounted) return null;

  const handleChange = (next: boolean) => {
    setChecked(next);
    setTheme(next ? "dark" : "light");
  };

  return (
    <div className={`relative inline-grid h-7 grid-cols-[1fr_1fr] items-center text-xs font-medium ${className || ""}`}>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={handleChange}
        className="peer data-[state=unchecked]:bg-input/50 absolute inset-0 h-[inherit] w-auto [&_span]:z-10 [&_span]:h-full [&_span]:w-1/2 [&_span]:transition-transform [&_span]:duration-200 [&_span]:ease-[cubic-bezier(0.16,1,0.3,1)] [&_span]:data-[state=checked]:translate-x-full [&_span]:data-[state=checked]:rtl:-translate-x-full"
      />
      <span className="pointer-events-none text-[var(--color-base-content)] relative ms-0.5 flex min-w-6 items-center justify-center text-center transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-[state=checked]:invisible peer-data-[state=unchecked]:translate-x-full peer-data-[state=unchecked]:rtl:-translate-x-full">
        <MoonIcon size={14} aria-hidden="true" />
      </span>
      <span className="peer-data-[state=checked]:text-background text-[var(--color-base-content)] pointer-events-none relative me-0.5 flex min-w-6 items-center justify-center text-center transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-[state=checked]:-translate-x-full peer-data-[state=unchecked]:invisible peer-data-[state=checked]:rtl:translate-x-full">
        <SunIcon size={14} aria-hidden="true" />
      </span>
      <Label htmlFor={id} className="sr-only text-2xs text-[var(--color-base-content)]">
        Toggle theme
      </Label>
    </div>
  );
};

export default SwitchTheme;
