"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
