import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleError, jsonError, uuidParam } from "@/lib/api";
import { cancelEmail, sendEmail, updateEmailDraft } from "@/lib/repo";

export const runtime = "nodejs";

const patchBody = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10_000),
  toEmail: z.union([z.string().trim().email().max(254), z.literal("").transform(() => null)]),
});

const postBody = z.object({ action: z.enum(["send", "cancel"]), confirmed: z.literal(true) });

/** Edit a draft. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/emails/[id]">) {
  const { id } = await ctx.params;
  if (!uuidParam.safeParse(id).success) return jsonError("Invalid email id.", 400);
  try {
    await updateEmailDraft(id, patchBody.parse(await req.json()));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

/** Arjun approves and sends (or cancels) a prepared email. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/emails/[id]">) {
  const { id } = await ctx.params;
  if (!uuidParam.safeParse(id).success) return jsonError("Invalid email id.", 400);
  try {
    const { action } = postBody.parse(await req.json());
    if (action === "send") await sendEmail(id);
    else await cancelEmail(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
