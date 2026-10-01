"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/ui";

export function EvaluateButton({
  candidateId,
  label = "Run AI evaluation",
  rerun,
  variant = "primary",
}: {
  candidateId: string;
  label?: string;
  rerun?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await fetch(`/api/candidates/${candidateId}/evaluate`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      toast(await apiError(res), "error");
      router.refresh();
      return;
    }
    toast("Evaluation complete.", "success");
    router.refresh();
  }

  return (
    <Button variant={variant} onClick={run} loading={busy} size={rerun ? "sm" : "md"}>
      {!busy && (rerun ? <RotateCcw className="size-3.5" /> : <Sparkles className="size-4" />)}
      {busy ? "Evaluating… (~20–40s)" : label}
    </Button>
  );
}
