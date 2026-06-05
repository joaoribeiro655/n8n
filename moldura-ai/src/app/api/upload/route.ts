import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = (form.get("kind") as string) || "asset";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo maior que 15MB" }, { status: 413 });
  }

  try {
    const url = await saveUpload(session.tenantId, file, kind);
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha no upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
