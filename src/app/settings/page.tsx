import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { connection } from "next/server";
import { SettingsForm } from "@/components/settings-form";
import { SetupRequired } from "@/components/setup-required";
import { Card, Eyebrow, SectionHeader } from "@/components/ui/card";
import { getSettings } from "@/lib/data";
import { configStatus } from "@/lib/env";
import { safeLoad } from "@/lib/safe-load";

export const metadata: Metadata = { title: "Settings" };

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span className={`grid size-5 shrink-0 place-items-center rounded-full ${ok ? "bg-ok-soft text-ok" : "bg-surface-2 text-subtle ring-1 ring-line"}`}>
        {ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1 text-[13px]">
        <p className="font-medium">{label}</p>
        <p className="truncate text-muted">{detail}</p>
      </div>
    </li>
  );
}

export default async function SettingsPage() {
  await connection();
  const s = configStatus();
  const loaded = await safeLoad(getSettings);
  if (!loaded.ok) return <SetupRequired reason={loaded.reason} message={loaded.message} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="animate-rise">
        <Eyebrow>Workspace</Eyebrow>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight">Settings</h1>
      </div>

      <Card>
        <SectionHeader title="Integrations" hint="Secrets live in server environment variables only. Nothing here is exposed to the browser." />
        <ul className="divide-y divide-line">
          <Status ok={s.database} label="Neon Postgres" detail={s.database ? "Connected via DATABASE_URL" : "Set DATABASE_URL"} />
          <Status ok={s.gemini} label="Gemini" detail={s.gemini ? `Model: ${s.geminiModel}` : "Set GEMINI_API_KEY"} />
          <Status
            ok={s.email}
            label="Resend (candidate email)"
            detail={
              !s.email
                ? "Not configured. Decisions create drafts only (set RESEND_API_KEY + RESEND_FROM_EMAIL)"
                : s.emailTestRecipient
                  ? `Test mode: every email is delivered to ${s.emailTestRecipient}, not the candidate`
                  : `Sending as ${s.emailFrom}`
            }
          />
        </ul>
      </Card>

      <Card>
        <SectionHeader title="Decision workflow" hint="The AI recommends; only the decision maker changes a candidate's status." />
        <SettingsForm initial={loaded.data} emailConfigured={s.email} />
      </Card>
    </div>
  );
}
