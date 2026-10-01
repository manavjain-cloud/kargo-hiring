import { Check, CircleAlert, CircleDashed, Lock, X } from "lucide-react";
import type { ReactNode } from "react";
import type { RoleCode, Tier } from "@/lib/rubric";
import { ROLES } from "@/lib/rubric";
import type { DecisionCode, PipelineStatus } from "@/lib/types";
import { DECISION_LABEL, STATUS_LABEL } from "@/lib/types";
import type { EvidenceStatus } from "@/lib/pipeline/evidence";
import { cn } from "@/lib/ui";

const pill = "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap";

export function TierBadge({ tier, size = "sm" }: { tier: Tier | null; size?: "sm" | "lg" }) {
  if (!tier) return <span className={cn(pill, "bg-surface-2 text-subtle")}>—</span>;
  const styles: Record<Tier, string> = {
    SHORTLIST: "bg-accent text-accent-fg",
    CONSIDER: "bg-amber-soft text-amber ring-1 ring-inset ring-amber/25",
    PASS: "bg-surface-2 text-muted ring-1 ring-inset ring-line",
  };
  return (
    <span className={cn(pill, "tracking-[0.06em]", styles[tier], size === "lg" && "px-2.5 py-1 text-[12.5px]")}>
      {tier}
    </span>
  );
}

export function GateBadge({ passed, role }: { passed: boolean | null; role?: RoleCode }) {
  if (passed == null) return <span className="text-subtle">—</span>;
  return passed ? (
    <span className={cn(pill, "bg-surface-2 text-fg ring-1 ring-inset ring-line")} title={role ? `C6 ≥ ${ROLES[role].gateMin}` : undefined}>
      <Check className="size-3" strokeWidth={3} /> Pass
    </span>
  ) : (
    <span className={cn(pill, "text-accent-text ring-1 ring-inset ring-accent/40")} title={role ? `Requires C6 ≥ ${ROLES[role].gateMin}` : undefined}>
      <X className="size-3" strokeWidth={3} /> Fail
    </span>
  );
}

export function RoleChip({ role, className }: { role: RoleCode; className?: string }) {
  return (
    <span className={cn(pill, "bg-surface-2 font-medium text-muted ring-1 ring-inset ring-line", className)}>
      {ROLES[role].shortTitle}
    </span>
  );
}

export function StatusPill({ status }: { status: PipelineStatus }) {
  const dot: Record<PipelineStatus, string> = {
    uploaded: "bg-subtle",
    evaluating: "bg-amber animate-pulse",
    evaluated: "bg-accent",
    failed: "bg-accent",
    moved_forward: "bg-ok",
    on_hold: "bg-amber",
    declined: "bg-subtle",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] whitespace-nowrap text-muted">
      <span className={cn("size-1.5 rounded-full", dot[status])} />
      <span className={cn(status === "evaluated" && "font-medium text-fg", status === "failed" && "text-accent-text")}>
        {STATUS_LABEL[status]}
      </span>
    </span>
  );
}

export function DecisionPill({ decision }: { decision: DecisionCode }) {
  const style: Record<DecisionCode, string> = {
    move_forward: "bg-ok-soft text-ok",
    hold: "bg-amber-soft text-amber",
    decline: "bg-surface-2 text-muted ring-1 ring-inset ring-line",
  };
  return <span className={cn(pill, style[decision])}>{DECISION_LABEL[decision]}</span>;
}

export function ConfidenceTag({ level }: { level: "high" | "medium" | "low" }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-px text-[10.5px] font-semibold tracking-wide uppercase",
        level === "high" && "bg-surface-2 text-muted",
        level === "medium" && "bg-surface-2 text-muted",
        level === "low" && "bg-amber-soft text-amber",
      )}
      title="How well the CV evidence supports this score"
    >
      {level} confidence
    </span>
  );
}

export function EvidenceKind({ kind }: { kind: EvidenceStatus | "inference" | "missing" }) {
  const map: Record<string, { label: string; icon: ReactNode; cls: string }> = {
    verified: { label: "CV evidence", icon: <Check className="size-3" strokeWidth={3} />, cls: "bg-ok-soft text-ok" },
    near: { label: "CV evidence · near-verbatim", icon: <Check className="size-3" strokeWidth={3} />, cls: "bg-ok-soft text-ok" },
    unverified: { label: "Unverified", icon: <X className="size-3" />, cls: "bg-accent-soft text-accent-text" },
    inference: { label: "Inference", icon: <CircleDashed className="size-3" />, cls: "bg-surface-2 text-muted ring-1 ring-inset ring-line" },
    missing: { label: "Missing", icon: <CircleAlert className="size-3" />, cls: "bg-amber-soft text-amber" },
  };
  const m = map[kind];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-px text-[10.5px] font-semibold tracking-wide uppercase", m.cls)}>
      {m.icon}
      {m.label}
    </span>
  );
}

export function HumanOnlyTag() {
  return (
    <span className={cn(pill, "bg-surface-2 font-medium text-muted ring-1 ring-inset ring-line")}>
      <Lock className="size-3" /> Human decision
    </span>
  );
}
