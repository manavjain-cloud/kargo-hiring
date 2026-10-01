import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleError } from "@/lib/api";
import { updateSettings } from "@/lib/repo";

export const runtime = "nodejs";

const body = z.object({
  reviewerName: z.string().trim().min(1).max(80).optional(),
  companyName: z.string().trim().min(1).max(80).optional(),
  autoSendAfterDecision: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    await updateSettings(body.parse(await req.json()));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
