import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleError, jsonError } from "@/lib/api";
import { extractCvText, MAX_FILE_BYTES } from "@/lib/extract";
import { createCandidate } from "@/lib/repo";

export const runtime = "nodejs";

const roleSchema = z.enum(["pm", "spm"]);

/** Upload one CV (multipart: file, role). Stores the file + extracted text; evaluation is a separate call. */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const role = roleSchema.safeParse(form.get("role"));
    if (!role.success) return jsonError("Select the role this candidate applied for (PM or Senior PM).", 400);
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Attach a CV file.", 400);
    if (file.size > MAX_FILE_BYTES) return jsonError("File is larger than 10 MB.", 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { kind, text } = await extractCvText(file.name, bytes);
    const created = await createCandidate({ roleCode: role.data, filename: file.name, kind, bytes, text });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
