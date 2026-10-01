"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ROLE_COOKIE, parseRoleFilter, type RoleFilter } from "@/lib/types";
import { cn } from "@/lib/ui";

const OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pm", label: "PM" },
  { value: "spm", label: "Senior PM" },
];

function persistRole(v: RoleFilter) {
  document.cookie = `${ROLE_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;
}

export function RoleSwitcher({ initial }: { initial: RoleFilter }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<RoleFilter | null>(null);
  // Layouts do not re-render on query changes, so follow the URL (then the last click, then the cookie).
  const current = (pathname === "/" ? parseRoleFilter(params.get("role")) : null) ?? chosen ?? initial;

  function select(v: RoleFilter) {
    setChosen(v);
    persistRole(v);
    const next = new URLSearchParams(params.toString());
    next.set("role", v);
    start(() => router.push(pathname === "/" ? `/?${next.toString()}` : `/?role=${v}`));
  }

  return (
    <div
      role="radiogroup"
      aria-label="Role"
      className={cn("inline-flex rounded-lg border border-line bg-surface-2 p-0.5 transition-opacity", pending && "opacity-70")}
    >
      {OPTIONS.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => select(o.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[13px] font-medium transition-all",
              active ? "bg-surface text-fg shadow-card ring-1 ring-line" : "text-muted hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
