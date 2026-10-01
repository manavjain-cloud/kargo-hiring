"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // true only after hydration, so the icon matches the real theme
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {mounted ? dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" /> : <span className="size-[18px]" />}
    </button>
  );
}
