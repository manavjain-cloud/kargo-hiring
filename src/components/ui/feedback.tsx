import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {icon && (
        <div className="mb-4 grid size-11 place-items-center rounded-xl border border-line bg-surface-2 text-muted">{icon}</div>
      )}
      <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      {children && <div className="mt-1.5 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({
  tone = "neutral",
  title,
  children,
  icon,
  className,
}: {
  tone?: "neutral" | "accent" | "amber";
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border px-3.5 py-3 text-[13px]",
        tone === "neutral" && "border-line bg-surface-2 text-muted",
        tone === "accent" && "border-accent/30 bg-accent-soft text-fg",
        tone === "amber" && "border-amber/25 bg-amber-soft text-fg",
        className,
      )}
      role={tone === "accent" ? "alert" : undefined}
    >
      {icon && <div className={cn("mt-px shrink-0", tone === "accent" ? "text-accent-text" : tone === "amber" ? "text-amber" : "text-subtle")}>{icon}</div>}
      <div className="min-w-0">
        {title && <p className="font-semibold text-fg">{title}</p>}
        <div className={cn(title && "mt-0.5")}>{children}</div>
      </div>
    </div>
  );
}
