import "server-only";
import { Resend } from "resend";
import { config } from "../env";

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email sending isn't configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL to .env.local.");
    this.name = "EmailNotConfiguredError";
  }
}

export interface SendResult {
  id: string;
  /** Where the email was actually delivered (differs from the candidate in test mode). */
  deliveredTo: string;
  testMode: boolean;
}

export async function sendViaResend(msg: { to: string; subject: string; text: string }): Promise<SendResult> {
  const { resendApiKey, resendFrom, resendTestRecipient } = config();
  if (!resendApiKey || !resendFrom) throw new EmailNotConfiguredError();

  // Test mode: Resend's sandbox sender can only deliver to the account owner, so redirect
  // there and say clearly who the email was meant for. Nothing reaches the candidate.
  const testMode = Boolean(resendTestRecipient);
  const to = resendTestRecipient ?? msg.to;
  const subject = testMode ? `[TEST · for ${msg.to}] ${msg.subject}` : msg.subject;
  const text = testMode
    ? `── Kargo Hiring test mode ──\nThis email would have gone to: ${msg.to}\nIt was redirected to you because RESEND_TEST_RECIPIENT is set.\n────────────────────────────\n\n${msg.text}`
    : msg.text;

  const resend = new Resend(resendApiKey);
  const { data, error } = await resend.emails.send({ from: resendFrom, to: [to], subject, text });
  if (error || !data) throw new Error(friendlyResendError(error?.message));
  return { id: data.id, deliveredTo: to, testMode };
}

function friendlyResendError(message: string | undefined): string {
  if (!message) return "Resend did not accept the email.";
  if (/only send testing emails to your own email/i.test(message)) {
    return "Resend is in sandbox mode: without a verified domain it only delivers to your own Resend email. Verify a domain at resend.com/domains, or set RESEND_TEST_RECIPIENT to your own address to demo sending.";
  }
  return message;
}
