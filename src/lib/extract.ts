/**
 * Safe CV text extraction for PDF, DOCX and TXT. Validates by magic bytes,
 * not just the extension the browser reports.
 */
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MIN_TEXT_CHARS = 200;

export const ACCEPTED_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
} as const;

export type FileKind = keyof typeof ACCEPTED_TYPES;

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

export function detectKind(filename: string, bytes: Uint8Array): FileKind {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04; // PK..
  if (ext === "pdf" && isPdf) return "pdf";
  if (ext === "docx" && isZip) return "docx";
  if (ext === "txt" && !isPdf && !isZip) return "txt";
  if (ext === "doc") throw new ExtractionError("Legacy .doc files aren't supported — save as .docx or PDF.");
  throw new ExtractionError("Unsupported or mismatched file type. Upload a PDF, DOCX or TXT CV.");
}

function normalise(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractCvText(filename: string, bytes: Uint8Array): Promise<{ kind: FileKind; text: string }> {
  if (bytes.byteLength === 0) throw new ExtractionError("The file is empty.");
  if (bytes.byteLength > MAX_FILE_BYTES) throw new ExtractionError("File is larger than 10 MB.");

  const kind = detectKind(filename, bytes);
  let raw: string;
  try {
    if (kind === "pdf") {
      // verbosity 0 = errors only; keeps pdf.js font warnings out of the server log
      const pdf = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0 });
      raw = (await extractText(pdf, { mergePages: true })).text;
    } else if (kind === "docx") {
      raw = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
    } else {
      raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
  } catch {
    throw new ExtractionError("Couldn't read this file. It may be corrupted or password-protected.");
  }

  const text = normalise(raw);
  if (text.length < MIN_TEXT_CHARS) {
    throw new ExtractionError(
      "Almost no text could be extracted — this looks like a scanned/image-only CV. Upload a text-based PDF or DOCX.",
    );
  }
  return { kind, text };
}

/** Readable name from a filename like "07_jane_doe.pdf" → "Jane Doe". */
export function nameFromFilename(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, "");
  const words = base
    .split(/[_\-\s.]+/)
    .filter((w) => /^[a-z]+$/i.test(w) && !/^(cv|resume|pm|spm|final|updated|new|copy)$/i.test(w));
  if (words.length === 0) return null;
  return words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/**
 * Tidies a name read from a CV: PDFs often repeat the header ("ARNAV SENArnav Sen"),
 * and some CVs set the name in capitals. Returns null if nothing usable remains.
 */
export function cleanPersonName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Split words glued at a case boundary: "SENArnav" → "SEN Arnav".
  const spaced = raw.replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2").replace(/\s+/g, " ").trim();
  let words = spaced.split(" ");
  const n = words.length;
  if (n >= 2 && n % 2 === 0) {
    const first = words.slice(0, n / 2);
    const second = words.slice(n / 2);
    const sameIgnoringCase = first.join(" ").toLowerCase() === second.join(" ").toLowerCase();
    // Only treat it as a repeated header if 2+ words repeat, or the copies differ in case —
    // a genuine name can repeat a single word.
    if (sameIgnoringCase && (n >= 4 || first.join(" ") !== second.join(" "))) {
      // Prefer the normally-cased copy.
      words = /[a-z]/.test(second.join("")) ? second : first;
    }
  }
  let name = words.join(" ");
  if (name === name.toUpperCase() && /\p{Lu}/u.test(name)) {
    name = name.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
  }
  return name.length >= 2 && name.length <= 120 ? name : null;
}

/** Jaccard similarity on word 5-shingles — flags near-identical CVs submitted under different names. */
export function shingleSimilarity(a: string, b: string): number {
  const shingles = (t: string) => {
    const w = t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ");
    const s = new Set<string>();
    for (let i = 0; i + 5 <= w.length; i++) s.add(w.slice(i, i + 5).join(" "));
    return s;
  };
  const sa = shingles(a);
  const sb = shingles(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  return inter / (sa.size + sb.size - inter);
}
