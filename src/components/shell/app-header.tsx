import { Settings } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ROLE_COOKIE, parseRoleFilter, type RoleFilter } from "@/lib/types";
import { KargoMark } from "./logo";
import { NavLinks } from "./nav-links";
import { RoleSwitcher } from "./role-switcher";
import { ThemeToggle } from "./theme-toggle";

export async function currentRoleFilter(param?: string | string[]): Promise<RoleFilter> {
  const fromParam = parseRoleFilter(typeof param === "string" ? param : null);
  if (fromParam) return fromParam;
  return parseRoleFilter((await cookies()).get(ROLE_COOKIE)?.value) ?? "all";
}

export async function AppHeader() {
  const role = await currentRoleFilter();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Kargo Hiring Intelligence — home">
          <KargoMark />
          <span className="leading-none">
            <span className="block text-[15px] font-bold tracking-[0.02em]">KARGO</span>
            <span className="block text-[10.5px] font-medium tracking-[0.08em] text-subtle uppercase">Hiring Intelligence</span>
          </span>
        </Link>
        <div className="ml-4 hidden md:block">
          <NavLinks />
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Suspense fallback={<div className="h-8 w-44 rounded-lg bg-surface-2" />}>
            <RoleSwitcher initial={role} />
          </Suspense>
          <ThemeToggle />
          <Link
            href="/settings"
            className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="size-[18px]" />
          </Link>
        </div>
      </div>
      <div className="border-t border-line px-4 py-1.5 md:hidden">
        <NavLinks />
      </div>
    </header>
  );
}
