"use client";

import { Mail, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { DECISION_LABEL, type EmailView } from "@/lib/types";
import { apiError, cn, dateTime } from "@/lib/ui";

const STATUS_STYLE: Record<EmailView["status"], string> = {
  draft: "bg-surface-2 text-fg ring-1 ring-inset ring-line",
  sent: "bg-ok-soft text-ok",
  failed: "bg-accent-soft text-accent-text",
  cancelled: "bg-surface-2 text-subtle line-through",
};

/** Downstream communication. Prepared after Arjun's decision; sent only on his approval. */
export function EmailPanel({
  email,
  emailConfigured,
  testRecipient,
}: {
  email: EmailView;
  emailConfigured: boolean;
  testRecipient: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const editable = email.status === "draft" || email.status === "failed";
  const [to, setTo] = useState(email.toEmail ?? "");
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [busy, setBusy] = useState<"save" | "send" | "cancel" | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const dirty = to !== (email.toEmail ?? "") || subject !== email.subject || body !== email.body;
  const validTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim());

  async function save(): Promise<boolean> {
    setBusy("save");
    const res = await fetch(`/api/emails/${email.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, toEmail: to.trim() }),
    });
    setBusy(null);
    if (!res.ok) {
      toast(await apiError(res), "error");
      return false;
    }
    return true;
  }

  async function act(action: "send" | "cancel") {
    if (action === "send" && dirty && !(await save())) return;
    setBusy(action);
    const res = await fetch(`/api/emails/${email.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, confirmed: true }),
    });
    setBusy(null);
    setConfirmSend(false);
    if (!res.ok) toast(await apiError(res), "error");
    else
      toast(
        action === "send" ? (testRecipient ? `Test mode: email delivered to ${testRecipient}.` : `Email sent to ${to}.`) : "Draft cancelled.",
        "success",
      );
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <Mail className="size-3.5" /> {DECISION_LABEL[email.template]} email
        </p>
        <span className={cn("rounded px-1.5 py-px text-[10.5px] font-semibold tracking-wide uppercase", STATUS_STYLE[email.status])}>
          {email.status}
        </span>
      </div>

      {editable ? (
        <div className="space-y-2">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="candidate@email.com"
            aria-label="To"
            className={cn(
              "h-8 w-full rounded-md border bg-surface-2 px-2.5 text-[13px] placeholder:text-subtle",
              to && !validTo ? "border-accent" : "border-line",
            )}
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Subject"
            className="h-8 w-full rounded-md border border-line bg-surface-2 px-2.5 text-[13px] font-medium"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            aria-label="Body"
            className="w-full resize-y rounded-md border border-line bg-surface-2 px-2.5 py-2 text-[12.5px] leading-relaxed"
          />
          {email.error && <p className="text-[12px] text-accent-text">Last attempt failed: {email.error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmSend(true)}
              disabled={!emailConfigured || !validTo || busy !== null}
              title={!emailConfigured ? "Add RESEND_API_KEY and RESEND_FROM_EMAIL to enable sending" : undefined}
            >
              <Send className="size-3.5" /> Approve & send
            </Button>
            {dirty && (
              <Button size="sm" onClick={save} loading={busy === "save"}>
                Save draft
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => act("cancel")} loading={busy === "cancel"}>
              Discard
            </Button>
          </div>
          {emailConfigured && testRecipient && (
            <p className="rounded-md bg-amber-soft px-2.5 py-1.5 text-[12px] text-fg">
              <strong>Test mode:</strong> this email will be delivered to <strong>{testRecipient}</strong>, not the candidate. It&apos;s
              marked as intended for {to || "the candidate"}.
            </p>
          )}
          {!emailConfigured && (
            <p className="text-[12px] text-subtle">
              Sending is off: Resend isn&apos;t configured yet. The draft is saved and ready to go once it is.
            </p>
          )}
          {emailConfigured && !validTo && <p className="text-[12px] text-subtle">Add a valid recipient address to send.</p>}
        </div>
      ) : (
        <div className="rounded-md border border-line bg-surface-2 px-3 py-2.5 text-[12.5px]">
          <p className="font-medium">{email.subject}</p>
          <p className="mt-0.5 text-muted">
            To {email.toEmail ?? "—"}
            {email.sentAt && ` · sent ${dateTime(email.sentAt)}`}
          </p>
          {email.testDeliveredTo && (
            <p className="mt-1 text-[12px] text-amber">Test mode: actually delivered to {email.testDeliveredTo}</p>
          )}
        </div>
      )}

      <Dialog
        open={confirmSend}
        onClose={() => busy === null && setConfirmSend(false)}
        title="Send this email?"
        description={
          testRecipient ? (
            <>
              Test mode: delivered to <strong className="text-fg">{testRecipient}</strong>, marked as intended for {to}.
            </>
          ) : (
            <>
              To <strong className="text-fg">{to}</strong> via Resend. This can&apos;t be unsent.
            </>
          )
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmSend(false)} disabled={busy !== null}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => act("send")} loading={busy === "send"}>
              <Send className="size-3.5" /> Send now
            </Button>
          </>
        }
      >
        <p className="text-[13px] font-medium">{subject}</p>
        <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-surface-2 p-3 font-sans text-[12.5px] whitespace-pre-wrap text-muted">{body}</pre>
      </Dialog>
    </div>
  );
}
