"use client";

import { ArrowRight, Pause, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { Tier } from "@/lib/rubric";
import { DECISION_LABEL, type DecisionCode } from "@/lib/types";
import { apiError, cn } from "@/lib/ui";

const COPY: Record<DecisionCode, { verb: string; after: string }> = {
  move_forward: {
    verb: "Move forward",
    after: "An invitation email is drafted for you to review. The interview probes are ready on this page.",
  },
  hold: { verb: "Put on hold", after: "A holding update is drafted, so the candidate isn't left waiting in silence." },
  decline: { verb: "Decline", after: "A respectful decline is drafted for you to review before it goes out." },
};

export function DecisionControls({
  candidateId,
  candidateName,
  current,
  aiTier,
  disabled,
  layout = "row",
}: {
  candidateId: string;
  candidateName: string;
  current: DecisionCode | null;
  aiTier: Tier | null;
  disabled?: string | null;
  layout?: "row" | "stack";
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<DecisionCode | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    const res = await fetch(`/api/candidates/${candidateId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: pending, note: note.trim() || undefined, confirmed: true }),
    });
    setSaving(false);
    if (!res.ok) {
      toast(await apiError(res), "error");
      return;
    }
    const body = (await res.json()) as { autoSent: boolean };
    toast(
      `${DECISION_LABEL[pending]} recorded for ${candidateName}. ${body.autoSent ? "Email sent." : "Email draft ready below."}`,
      "success",
    );
    setPending(null);
    setNote("");
    router.refresh();
  }

  const btn = (d: DecisionCode, icon: React.ReactNode, variant: "primary" | "secondary" | "outline-danger") => (
    <Button
      key={d}
      variant={current === d ? "primary" : variant === "primary" && current ? "secondary" : variant}
      size={layout === "stack" ? "md" : "md"}
      onClick={() => setPending(d)}
      disabled={Boolean(disabled)}
      className={cn(layout === "stack" && "w-full justify-start", current === d && d !== "move_forward" && "bg-fg text-bg hover:bg-fg/90")}
      aria-pressed={current === d}
    >
      {icon}
      {DECISION_LABEL[d]}
    </Button>
  );

  const mismatch =
    pending &&
    aiTier &&
    ((pending === "move_forward" && aiTier === "PASS") || (pending === "decline" && aiTier === "SHORTLIST"));

  return (
    <>
      <div className={cn(layout === "row" ? "flex flex-wrap gap-2" : "grid gap-2")} title={disabled ?? undefined}>
        {btn("move_forward", <ArrowRight className="size-4" />, "primary")}
        {btn("hold", <Pause className="size-4" />, "secondary")}
        {btn("decline", <X className="size-4" />, "outline-danger")}
      </div>

      <Dialog
        open={pending !== null}
        onClose={() => !saving && setPending(null)}
        title={pending ? `${COPY[pending].verb}: ${candidateName}?` : ""}
        description="This is your decision. The AI only recommends, and nothing changes until you confirm."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirm} loading={saving}>
              Confirm {pending ? DECISION_LABEL[pending] : ""}
            </Button>
          </>
        }
      >
        {pending && (
          <div className="space-y-3">
            <p className="text-[13px] text-muted">{COPY[pending].after} Nothing is sent without your approval unless you turned on auto-send in Settings.</p>
            {mismatch && (
              <p className="rounded-md bg-amber-soft px-3 py-2 text-[12.5px] text-fg">
                The AI recommendation was <strong>{aiTier}</strong>. Overriding it is completely fine. A short note helps you remember why.
              </p>
            )}
            <label className="block">
              <span className="text-[12.5px] font-medium">Note (optional, internal)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Why you made this call. Kept in the decision history and never sent to the candidate."
                className="mt-1 w-full resize-y rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] placeholder:text-subtle focus:border-line-strong"
              />
            </label>
          </div>
        )}
      </Dialog>
    </>
  );
}
