"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

const LINKS = [
  { href: "/", label: "Pipeline" },
  { href: "/rubric", label: "Rubric" },
  { href: "/past-hires", label: "Past hires" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-0.5" aria-label="Main">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" || pathname.startsWith("/candidates") : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "relative rounded-md px-2.5 py-1.5 text-[13.5px] font-medium transition-colors",
              active ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {l.label}
            {active && <span className="absolute inset-x-2.5 -bottom-[13px] h-[2px] rounded-full bg-accent" />}
          </Link>
        );
      })}
    </nav>
  );
}
