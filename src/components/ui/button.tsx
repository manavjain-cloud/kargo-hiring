import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/ui";

type Variant = "primary" | "secondary" | "ghost" | "outline-danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-all duration-150 select-none disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]",
  secondary: "bg-surface text-fg border border-line hover:border-line-strong hover:bg-surface-2",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  "outline-danger": "border border-line text-fg hover:border-accent hover:text-accent-text bg-surface",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-3.5 text-sm",
  lg: "h-11 px-5 text-[15px]",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  loading,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
