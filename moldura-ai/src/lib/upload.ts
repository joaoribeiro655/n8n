import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * Persists an uploaded file (or a data URL string) and returns its public URL.
 *
 * In production (Vercel) it stores the file in Vercel Blob — enabled automatically
 * when the BLOB_READ_WRITE_TOKEN env var is present. Locally (no token) it falls
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
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, buffer, {
      access: "public",
      contentType: mime,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  // Local filesystem fallback (development)
  const dir = path.join(UPLOAD_ROOT, tenantId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${tenantId}/${filename}`;
}
