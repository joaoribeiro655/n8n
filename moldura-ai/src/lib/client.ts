"use client";

/** Converts a data URL to a Blob (browser). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Uploads a Blob/File via the upload API and returns its public URL. */
export async function uploadBlob(blob: Blob, kind: string, filename = "image.png"): Promise<string> {
  const fd = new FormData();
  fd.append("file", new File([blob], filename, { type: blob.type }));
  fd.append("kind", kind);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Falha no upload");
  return data.url as string;
}

export type FrameDTO = {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  slotX: number;
  slotY: number;
  slotW: number;
  slotH: number;
  source: string;
};

export type BrandDTO = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  logoUrl: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  tagline: string | null;
};
