import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

export function Card({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={cn("rounded-xl border border-line bg-surface shadow-card", className)}>
      {children}
    </section>
  );
}

export function SectionHeader({
  index,
  title,
  hint,
  action,
}: {
  index?: number;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
          {index != null && (
            <span className="font-mono text-[11px] font-medium text-subtle tabular">{String(index).padStart(2, "0")}</span>
          )}
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      </div>
      {action}
    </header>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase", className)}>{children}</p>
  );
}
