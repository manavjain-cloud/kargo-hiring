"use client";

import { Check, FileText, RotateCcw, TriangleAlert, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Spinner } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { ROLES, type RoleCode } from "@/lib/rubric";
import { apiError, cn } from "@/lib/ui";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = [".pdf", ".docx", ".txt"];
const MAX_FILES = 100;

type ItemState = "queued" | "uploading" | "uploaded" | "evaluating" | "done" | "error";
interface Item {
  key: string;
  file: File;
  state: ItemState;
  message?: string;
  candidateId?: string;
  duplicate?: boolean;
  failedAt?: "upload" | "evaluate";
}

function validate(file: File): string | null {
  const ext = "." + (file.name.toLowerCase().split(".").pop() ?? "");
  if (!ACCEPT.includes(ext)) return "Unsupported type — use PDF, DOCX or TXT.";
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_BYTES) return "Larger than 10 MB.";
  return null;
}

export function UploadPanel({ initialRole, geminiReady }: { initialRole: RoleCode | null; geminiReady: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<RoleCode | null>(initialRole);
  const [items, setItems] = useState<Item[]>([]);
  const [evaluate, setEvaluate] = useState(geminiReady);
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);

  const patch = (key: string, p: Partial<Item>) => setItems((all) => all.map((i) => (i.key === key ? { ...i, ...p } : i)));

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).slice(0, MAX_FILES);
    setItems((prev) => {
      const seen = new Set(prev.map((p) => `${p.file.name}:${p.file.size}`));
      const next = [...prev];
      for (const file of incoming) {
        const id = `${file.name}:${file.size}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const err = validate(file);
        next.push({ key: `${id}:${Math.random()}`, file, state: err ? "error" : "queued", message: err ?? undefined });
      }
      return next;
    });
  }

  async function uploadOne(it: Item, r: RoleCode): Promise<string | null> {
    patch(it.key, { state: "uploading", message: undefined, failedAt: undefined });
    const fd = new FormData();
    fd.append("file", it.file);
    fd.append("role", r);
    const res = await fetch("/api/candidates", { method: "POST", body: fd });
    if (!res.ok) {
      patch(it.key, { state: "error", message: await apiError(res), failedAt: "upload" });
      return null;
    }
    const body = (await res.json()) as { id: string; duplicateOf: string | null };
    patch(it.key, { state: "uploaded", candidateId: body.id, duplicate: Boolean(body.duplicateOf) });
    return body.id;
  }

  async function evaluateOne(key: string, id: string): Promise<boolean> {
    patch(key, { state: "evaluating", message: undefined, failedAt: undefined });
    const res = await fetch(`/api/candidates/${id}/evaluate`, { method: "POST" });
    if (!res.ok) {
      patch(key, { state: "error", message: await apiError(res), failedAt: "evaluate", candidateId: id });
      return false;
    }
    patch(key, { state: "done" });
    return true;
  }

  async function start() {
    if (!role) return;
    setRunning(true);
    const queue = items.filter((i) => i.state === "queued");
    // Upload with limited parallelism, evaluate strictly one at a time (rate limits).
    const uploaded: { key: string; id: string }[] = [];
    for (let i = 0; i < queue.length; i += 3) {
      const batch = queue.slice(i, i + 3);
      const ids = await Promise.all(batch.map((it) => uploadOne(it, role)));
      ids.forEach((id, j) => id && uploaded.push({ key: batch[j].key, id }));
    }
    let evaluated = 0;
    if (evaluate) {
      for (const u of uploaded) if (await evaluateOne(u.key, u.id)) evaluated++;
    }
    setRunning(false);
    router.refresh();
    toast(
      evaluate
        ? `${uploaded.length} uploaded · ${evaluated} evaluated.`
        : `${uploaded.length} uploaded. Run evaluation from the pipeline when ready.`,
      uploaded.length === queue.length && (!evaluate || evaluated === uploaded.length) ? "success" : "error",
    );
  }

  async function retry(it: Item) {
    if (!role) return;
    setRunning(true);
    if (it.failedAt === "evaluate" && it.candidateId) await evaluateOne(it.key, it.candidateId);
    else {
      const id = await uploadOne(it, role);
      if (id && evaluate) await evaluateOne(it.key, id);
    }
    setRunning(false);
    router.refresh();
  }

  const queued = items.filter((i) => i.state === "queued").length;
  const finished = items.filter((i) => i.state === "done" || i.state === "uploaded").length;

  return (
    <div className="space-y-5">
      {/* Step 1 — role */}
      <div>
        <p className="mb-2 text-[13px] font-semibold">
          1. Role applied for <span className="text-accent-text">*</span>
        </p>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Role applied for">
          {(Object.keys(ROLES) as RoleCode[]).map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={role === r}
              disabled={running}
              onClick={() => setRole(r)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-all",
                role === r ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <p className="flex items-center justify-between text-sm font-semibold">
                {ROLES[r].title}
                <span className={cn("grid size-4 place-items-center rounded-full border", role === r ? "border-accent bg-accent text-accent-fg" : "border-line-strong")}>
                  {role === r && <Check className="size-2.5" strokeWidth={4} />}
                </span>
              </p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {ROLES[r].focus} · gate C6 ≥ {ROLES[r].gateMin}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-subtle">
          Every CV is also scored for the other role&apos;s fit, so strong profiles for the wrong role still surface.
        </p>
      </div>

      {/* Step 2 — files */}
      <div>
        <p className="mb-2 text-[13px] font-semibold">2. CV files</p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!running) addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2/50",
          )}
        >
          <div className="mb-3 grid size-11 place-items-center rounded-xl bg-surface text-muted ring-1 ring-line">
            <UploadCloud className="size-5" />
          </div>
          <p className="text-sm font-medium">Drop CVs here</p>
          <p className="mt-0.5 text-[12.5px] text-muted">PDF, DOCX or TXT · up to 10 MB each · multiple files OK</p>
          <Button className="mt-4" size="sm" onClick={() => inputRef.current?.click()} disabled={running}>
            Choose files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT.join(",")}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {items.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
              <FileText className="size-4 shrink-0 text-subtle" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{it.file.name}</p>
                {it.message && <p className={cn("text-[12px]", it.state === "error" ? "text-accent-text" : "text-muted")}>{it.message}</p>}
                {it.duplicate && (
                  <p className="flex items-center gap-1 text-[12px] text-amber">
                    <TriangleAlert className="size-3" /> Near-identical to an existing CV. Flagged for review.
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[12px] text-muted">
                {it.state === "queued" && `${(it.file.size / 1024).toFixed(0)} KB`}
                {it.state === "uploading" && (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner className="size-3.5" /> Uploading & extracting
                  </span>
                )}
                {it.state === "uploaded" && (evaluate ? "Queued for AI" : "Uploaded")}
                {it.state === "evaluating" && (
                  <span className="inline-flex items-center gap-1.5 text-fg">
                    <Spinner className="size-3.5 text-accent" /> AI evaluating
                  </span>
                )}
                {it.state === "done" && it.candidateId && (
                  <Link href={`/candidates/${it.candidateId}`} className="inline-flex items-center gap-1 font-medium text-ok hover:underline">
                    <Check className="size-3.5" strokeWidth={3} /> View result
                  </Link>
                )}
              </span>
              {it.state === "error" && it.failedAt && (
                <button onClick={() => retry(it)} disabled={running} className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Retry">
                  <RotateCcw className="size-3.5" />
                </button>
              )}
              {(it.state === "queued" || (it.state === "error" && !it.candidateId)) && !running && (
                <button
                  onClick={() => setItems((all) => all.filter((x) => x.key !== it.key))}
                  className="rounded p-1 text-subtle hover:bg-surface-2 hover:text-fg"
                  aria-label={`Remove ${it.file.name}`}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!geminiReady && (
        <Notice tone="amber" title="Gemini isn't configured">
          CVs can be uploaded now. Add GEMINI_API_KEY to evaluate them.
        </Notice>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={evaluate}
            onChange={(e) => setEvaluate(e.target.checked)}
            disabled={!geminiReady || running}
            className="size-4 accent-[var(--accent)]"
          />
          Run AI evaluation right after upload
        </label>
        <div className="flex items-center gap-2">
          {finished > 0 && !running && (
            <Link href="/" className="text-[13px] font-medium text-muted hover:text-fg">
              Back to pipeline
            </Link>
          )}
          <Button variant="primary" onClick={start} disabled={!role || queued === 0} loading={running}>
            {running ? "Processing…" : `Upload ${queued || ""} CV${queued === 1 ? "" : "s"}`.replace("  ", " ")}
          </Button>
        </div>
      </div>
      {!role && queued > 0 && <p className="text-right text-[12px] text-accent-text">Choose the role these candidates applied for.</p>}
    </div>
  );
}
