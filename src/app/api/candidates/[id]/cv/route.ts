import type { NextRequest } from "next/server";
import { handleError, jsonError, uuidParam } from "@/lib/api";
import { getCandidateFile } from "@/lib/repo";

export const runtime = "nodejs";

/** Streams the original CV file back to the (authenticated) viewer. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/candidates/[id]/cv">) {
  const { id } = await ctx.params;
  if (!uuidParam.safeParse(id).success) return jsonError("Invalid candidate id.", 400);
  try {
    const f = await getCandidateFile(id);
    if (!f) return jsonError("Source file not found.", 404);
    const bytes = Buffer.from(f.data_b64, "base64");
    const inline = f.mime_type === "application/pdf" || f.mime_type === "text/plain";
    return new Response(bytes, {
      headers: {
        "Content-Type": f.mime_type,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${f.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
