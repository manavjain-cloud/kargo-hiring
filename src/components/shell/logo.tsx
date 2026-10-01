export function KargoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <path d="M10 8v16M10 16l9-8M13.5 13l6.5 11" stroke="#fff" strokeWidth="3.2" strokeLinecap="square" fill="none" />
    </svg>
  );
}
