import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "text/html",
]);
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "text/html": "html",
};

/**
 * Finds the Vercel Blob read/write token, tolerating custom-prefixed names
 * (e.g. MYSTORE_BLOB_READ_WRITE_TOKEN) that Vercel may create.
 */
function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [k, v] of Object.entries(process.env)) {
    if (k.endsWith("BLOB_READ_WRITE_TOKEN") && v) return v;
  }
  return undefined;
}

/**
 * Persists an uploaded file (or a data URL string) and returns its public URL.
 *
 * In production (Vercel) it stores the file in Vercel Blob — enabled automatically
 * when a *BLOB_READ_WRITE_TOKEN env var is present. Locally (no token) it falls
 * back to writing under public/uploads so development keeps working.
 */
export async function saveUpload(
  tenantId: string,
  input: File | string,
  kind = "asset",
): Promise<string> {
  let buffer: Buffer;
  let ext: string;
  let mime: string;

  if (typeof input === "string") {
    // data URL: data:image/png;base64,....
    const match = input.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid data URL");
    mime = match[1];
    if (!ALLOWED.has(mime)) throw new Error("Unsupported image type");
    buffer = Buffer.from(match[2], "base64");
    ext = EXT[mime];
  } else {
    if (!ALLOWED.has(input.type)) throw new Error("Unsupported image type");
    mime = input.type;
    buffer = Buffer.from(await input.arrayBuffer());
    ext = EXT[input.type];
  }

  const filename = `${kind}-${randomUUID()}.${ext}`;
  const key = `${tenantId}/${filename}`;

  // Cloud storage (production / Vercel)
  const token = blobToken();
  if (token) {
    const blob = await put(key, buffer, {
      access: "public",
      contentType: mime,
      token,
    });
    return blob.url;
  }

  // On Vercel the filesystem is read-only — fail with a clear message instead of
  // a cryptic ENOENT, so the cause (missing Blob store) is obvious.
  if (process.env.VERCEL) {
    throw new Error(
      "Armazenamento de imagens (Vercel Blob) não está configurado. " +
        "Conecte um Blob Store ao projeto na aba Storage da Vercel e refaça o deploy (Redeploy).",
    );
  }

  // Local filesystem fallback (development)
  const dir = path.join(UPLOAD_ROOT, tenantId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${tenantId}/${filename}`;
}
