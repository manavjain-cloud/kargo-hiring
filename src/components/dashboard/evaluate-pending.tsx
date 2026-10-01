"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/ui";

/** Evaluates candidates one at a time (keeps within Gemini rate limits and serverless timeouts). */
export function EvaluatePending({ ids }: { ids: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function run() {
    let ok = 0;
    let failed = 0;
    setProgress({ done: 0, total: ids.length });
    for (const [i, id] of ids.entries()) {
      const res = await fetch(`/api/candidates/${id}/evaluate`, { method: "POST" });
      if (res.ok) ok++;
      else {
        failed++;
        const msg = await apiError(res);
        if (res.status === 503 && msg.toLowerCase().includes("configured")) {
          toast(msg, "error");
          break;
        }
      }
      setProgress({ done: i + 1, total: ids.length });
      router.refresh();
    }
    setProgress(null);
    toast(`Evaluated ${ok} candidate${ok === 1 ? "" : "s"}${failed ? ` · ${failed} failed (retry from the table)` : ""}.`, failed ? "error" : "success");
  }

  if (ids.length === 0) return null;
  return (
    <Button onClick={run} loading={progress !== null} variant="secondary">
      {!progress && <Sparkles className="size-4 text-accent-text" />}
      {progress ? `Evaluating ${progress.done + 1 > progress.total ? progress.total : progress.done + 1} of ${progress.total}…` : `Evaluate pending (${ids.length})`}
    </Button>
  );
}
