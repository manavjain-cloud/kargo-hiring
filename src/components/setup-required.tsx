import { Check, Database, X } from "lucide-react";
import { configStatus } from "@/lib/env";
import { Card } from "@/components/ui/card";

function Row({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${ok ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent-text"}`}>
        {ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
      </span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[13px] text-muted">{detail}</p>
      </div>
    </li>
  );
}

export function SetupRequired({ reason, message }: { reason: "no-database" | "no-schema" | "error"; message: string }) {
  const s = configStatus();
  return (
    <div className="mx-auto max-w-2xl animate-rise py-8">
      <Card className="overflow-hidden">
        <div className="border-b border-line px-6 py-5">
          <div className="mb-3 grid size-10 place-items-center rounded-lg bg-accent-soft text-accent-text">
            <Database className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {reason === "error" ? "Database unreachable" : "Finish setting up the workspace"}
          </h1>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
        <ul className="divide-y divide-line px-6 py-2">
          <Row ok={s.database} label="Neon Postgres" detail={s.database ? "DATABASE_URL is set." : "Add DATABASE_URL (pooled connection string) to .env.local."} />
          <Row
            ok={s.database && reason !== "no-schema"}
            label="Schema & seed data"
            detail={
              reason === "no-schema"
                ? "Run npm run db:setup to create tables and seed roles + past hires."
                : s.database && reason !== "error"
                  ? "Tables found."
                  : "Waiting on the database connection. Then run npm run db:setup."
            }
          />
          <Row ok={s.gemini} label="Gemini" detail={s.gemini ? `GEMINI_API_KEY is set · model ${s.geminiModel}` : "Add GEMINI_API_KEY to .env.local to run evaluations."} />
          <Row
            ok={s.email}
            label="Resend (optional)"
            detail={s.email ? `Sending from ${s.emailFrom}` : "Without RESEND_API_KEY + RESEND_FROM_EMAIL, decisions produce email drafts only."}
          />
        </ul>
        <div className="border-t border-line bg-surface-2/60 px-6 py-4 font-mono text-[12.5px] text-muted">
          <p>cp .env.example .env.local &nbsp;# then fill in values</p>
          <p>npm run db:setup</p>
          <p>npm run dev</p>
        </div>
      </Card>
    </div>
  );
}
