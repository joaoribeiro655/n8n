import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Encontra o token de leitura/escrita do Vercel Blob, tolerando nomes com
 * prefixo personalizado (ex.: MYSTORE_BLOB_READ_WRITE_TOKEN).
 */
function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [k, v] of Object.entries(process.env)) {
    if (k.endsWith("BLOB_READ_WRITE_TOKEN") && v) return v;
  }
  return undefined;
}

/**
 * Persiste um arquivo enviado (ou uma data URL) e devolve a URL pública.
 *
 * Em produção (Vercel) grava no Vercel Blob — ativado automaticamente quando há
 * uma variável *BLOB_READ_WRITE_TOKEN. Localmente (sem token) grava em
 * public/uploads para o desenvolvimento continuar funcionando.
 */
export async function saveUpload(
  tenantId: string,
  input: File | string,
  kind = "art",
): Promise<string> {
  let buffer: Buffer;
  let ext: string;
  let mime: string;

  if (typeof input === "string") {
    const match = input.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) throw new Error("Data URL inválida");
    mime = match[1];
    if (!ALLOWED.has(mime)) throw new Error("Tipo de imagem não suportado");
    buffer = Buffer.from(match[2], "base64");
    ext = EXT[mime];
  } else {
    if (!ALLOWED.has(input.type)) throw new Error("Tipo de imagem não suportado");
    mime = input.type;
    buffer = Buffer.from(await input.arrayBuffer());
    ext = EXT[input.type];
  }

  const filename = `${kind}-${randomUUID()}.${ext}`;
  const key = `${tenantId}/${filename}`;

  const token = blobToken();
  if (token) {
    const blob = await put(key, buffer, { access: "public", contentType: mime, token });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Armazenamento de imagens (Vercel Blob) não está configurado. " +
        "Conecte um Blob Store ao projeto na aba Storage da Vercel e refaça o deploy (Redeploy).",
    );
  }

  const dir = path.join(UPLOAD_ROOT, tenantId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${tenantId}/${filename}`;
}

/**
 * Salva um buffer já pronto (ex.: PNG renderizado na plataforma) e devolve a URL
 * pública. Mesmo destino do saveUpload: Vercel Blob em produção, disco no dev.
 */
export async function saveBuffer(
  tenantId: string,
  buffer: Buffer,
  mime = "image/png",
  kind = "art",
): Promise<string> {
  const ext = EXT[mime] ?? "png";
  const filename = `${kind}-${randomUUID()}.${ext}`;
  const key = `${tenantId}/${filename}`;

  const token = blobToken();
  if (token) {
    const blob = await put(key, buffer, { access: "public", contentType: mime, token });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Armazenamento de imagens (Vercel Blob) não está configurado. " +
        "Conecte um Blob Store ao projeto na aba Storage da Vercel e refaça o deploy (Redeploy).",
    );
  }

  const dir = path.join(UPLOAD_ROOT, tenantId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${tenantId}/${filename}`;
}
