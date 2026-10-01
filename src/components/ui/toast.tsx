"use client";

import { Check, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/ui";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

const Ctx = createContext<((message: string, tone?: Tone) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Tone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);
  const value = useMemo(() => push, [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex animate-rise items-start gap-2.5 rounded-lg border bg-surface px-3.5 py-3 text-[13px] shadow-card",
              t.tone === "error" ? "border-accent/40" : "border-line",
            )}
            role={t.tone === "error" ? "alert" : "status"}
          >
            <span
              className={cn(
                "mt-px grid size-4 shrink-0 place-items-center rounded-full",
                t.tone === "success" && "bg-ok text-surface",
                t.tone === "error" && "bg-accent text-accent-fg",
                t.tone === "info" && "bg-fg text-bg",
              )}
            >
              {t.tone === "error" ? <X className="size-2.5" strokeWidth={3.5} /> : <Check className="size-2.5" strokeWidth={3.5} />}
            </span>
            <p className="text-fg">{t.message}</p>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
