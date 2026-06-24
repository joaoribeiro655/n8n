import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";

// POST /api/upload  (multipart/form-data, campo "file")
// Sobe uma imagem (arte pronta) e devolve a URL pública.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  }

  try {
    const url = await saveUpload(session.tenantId, file, "art");
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha no upload" },
      { status: 400 },
    );
  }
}
