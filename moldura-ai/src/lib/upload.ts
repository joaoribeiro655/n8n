import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * Persists an uploaded file (or a data URL string) under public/uploads/<tenantId>/
 * and returns the public URL path (e.g. /uploads/<tenant>/<id>.png).
 */
export async function saveUpload(
  tenantId: string,
  input: File | string,
  kind = "asset",
): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, tenantId);
  await mkdir(dir, { recursive: true });

  let buffer: Buffer;
  let ext: string;

  if (typeof input === "string") {
    // data URL: data:image/png;base64,....
    const match = input.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid data URL");
    const mime = match[1];
    if (!ALLOWED.has(mime)) throw new Error("Unsupported image type");
    buffer = Buffer.from(match[2], "base64");
    ext = EXT[mime];
  } else {
    if (!ALLOWED.has(input.type)) throw new Error("Unsupported image type");
    const bytes = await input.arrayBuffer();
    buffer = Buffer.from(bytes);
    ext = EXT[input.type];
  }

  const filename = `${kind}-${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${tenantId}/${filename}`;
}
