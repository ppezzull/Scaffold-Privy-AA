"use client";

import { useEffect, useId, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Label } from "~~/components/ui/label";
import { Switch } from "~~/components/ui/switch";

export const SwitchTheme = ({ className }: { className?: string }) => {
  const id = useId();
  const { setTheme, resolvedTheme } = useTheme();
  const [checked, setChecked] = useState<boolean>(resolvedTheme === "dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setChecked(resolvedTheme === "dark"), [resolvedTheme]);

  if (!mounted) return null;

  const handleChange = (next: boolean) => {
    setChecked(next);
    setTheme(next ? "dark" : "light");
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className || ""}`}>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={handleChange}
        aria-label="Toggle switch"
        className="data-[state=checked]:bg-[var(--color-base-100)] data-[state=unchecked]:bg-[var(--color-primary)] border border-[var(--border)]"
      />
      <Label htmlFor={id} className="text-[var(--card-foreground)]">
        <span className="sr-only">Toggle switch</span>
        {checked ? (
          <SunIcon size={16} aria-hidden="true" className="text-[var(--card-foreground)]" />
        ) : (
          <MoonIcon size={16} aria-hidden="true" className="text-[var(--card-foreground)]" />
        )}
      </Label>
    </div>
  );
};

export default SwitchTheme;
