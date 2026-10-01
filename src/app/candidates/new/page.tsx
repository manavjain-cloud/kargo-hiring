import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { UploadPanel } from "@/components/upload/upload-panel";
import { Card, Eyebrow } from "@/components/ui/card";
import { configStatus } from "@/lib/env";
import { SetupRequired } from "@/components/setup-required";

export const metadata: Metadata = { title: "Upload CVs" };

export default async function UploadPage({ searchParams }: PageProps<"/candidates/new">) {
  await connection();
  const sp = await searchParams;
  const role = sp.role === "pm" || sp.role === "spm" ? sp.role : null;
  const status = configStatus();
  if (!status.database) return <SetupRequired reason="no-database" message="Connect a database before uploading CVs." />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Pipeline
      </Link>
      <div className="animate-rise">
        <Eyebrow>Ingest</Eyebrow>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Upload candidate CVs</h1>
        <p className="mt-1 text-sm text-muted">
          Files are stored privately. Text is extracted on the server and the AI recommendation is saved with its evidence.
        </p>
      </div>
      <Card className="animate-rise p-5">
        <UploadPanel initialRole={role} geminiReady={status.gemini} />
      </Card>
      <div className="flex gap-2.5 text-[12.5px] text-muted">
        <ShieldCheck className="mt-px size-4 shrink-0 text-subtle" />
        <p>
          Fairness: the scorer never sees the candidate&apos;s name, contact details or education. Career gaps, non-linear paths and
          non-PM titles are not penalised. Missing information becomes an interview probe, not a lower score.
        </p>
      </div>
    </div>
  );
}
