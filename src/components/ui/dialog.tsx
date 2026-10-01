"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** Accessible modal built on the native <dialog> element (focus trap + Esc for free). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(94vw,520px)] rounded-xl border border-line bg-surface p-0 text-fg shadow-card open:animate-rise"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <div className="mt-1 text-[13px] text-muted">{description}</div>}
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-subtle hover:bg-surface-2 hover:text-fg" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      {children && <div className="px-5 py-4">{children}</div>}
      {footer && <div className="flex justify-end gap-2 border-t border-line bg-surface-2/50 px-5 py-3">{footer}</div>}
    </dialog>
  );
}
