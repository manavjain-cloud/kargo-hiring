"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { AppSettings } from "@/lib/types";
import { apiError, cn } from "@/lib/ui";

export function SettingsForm({ initial, emailConfigured }: { initial: AppSettings; emailConfigured: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [reviewerName, setReviewer] = useState(initial.reviewerName);
  const [companyName, setCompany] = useState(initial.companyName);
  const [autoSend, setAutoSend] = useState(initial.autoSendAfterDecision);
  const [busy, setBusy] = useState(false);
  const dirty = reviewerName !== initial.reviewerName || companyName !== initial.companyName || autoSend !== initial.autoSendAfterDecision;

  async function save() {
    if (!reviewerName.trim() || !companyName.trim()) return toast("Names can't be empty.", "error");
    setBusy(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewerName: reviewerName.trim(), companyName: companyName.trim(), autoSendAfterDecision: autoSend }),
    });
    setBusy(false);
    if (!res.ok) return toast(await apiError(res), "error");
    toast("Settings saved.", "success");
    router.refresh();
  }

  return (
    <div className="space-y-5 px-5 py-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-[13px]">
          <span className="font-medium">Decision maker</span>
          <input value={reviewerName} onChange={(e) => setReviewer(e.target.value)} maxLength={80} className="mt-1 h-9 w-full rounded-md border border-line bg-surface-2 px-2.5" />
          <span className="mt-1 block text-[12px] text-subtle">Recorded on every decision and used to sign emails.</span>
        </label>
        <label className="block text-[13px]">
          <span className="font-medium">Company</span>
          <input value={companyName} onChange={(e) => setCompany(e.target.value)} maxLength={80} className="mt-1 h-9 w-full rounded-md border border-line bg-surface-2 px-2.5" />
        </label>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-line p-4">
        <div className="text-[13px]">
          <p className="font-medium">Auto-send candidate email after a decision</p>
          <p className="mt-0.5 text-muted">
            Off by default: every email waits as a draft for your approval. When on, the matching email goes out as soon as you confirm Move
            Forward, Hold or Decline.
          </p>
          {!emailConfigured && <p className="mt-1.5 text-[12px] text-amber">Requires Resend. Add RESEND_API_KEY and RESEND_FROM_EMAIL first.</p>}
        </div>
        <button
          role="switch"
          aria-checked={autoSend}
          aria-label="Auto-send candidate email after a decision"
          disabled={!emailConfigured}
          onClick={() => setAutoSend((v) => !v)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40",
            autoSend ? "bg-accent" : "bg-surface-3 ring-1 ring-line ring-inset",
          )}
        >
          <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", autoSend && "translate-x-5")} />
        </button>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={save} disabled={!dirty} loading={busy}>
          Save settings
        </Button>
      </div>
    </div>
  );
}
