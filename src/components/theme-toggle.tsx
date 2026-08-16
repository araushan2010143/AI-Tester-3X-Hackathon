"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useHydrated } from "@/lib/use-hydrated";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // `theme` is unknown during SSR/first paint — render a neutral placeholder until hydrated so
  // the icon doesn't flip (and mismatch) right after hydration.
  const mounted = useHydrated();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Toggle theme"}
      className="flex w-full items-center gap-3 rounded-lg py-2.5 pr-2.5 pl-4 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
    >
      {mounted ? (
        isDark ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />
      ) : (
        <span className="h-4 w-4 shrink-0" />
      )}
      {mounted ? (isDark ? "Dark theme" : "Light theme") : "Theme"}
    </button>
  );
}
