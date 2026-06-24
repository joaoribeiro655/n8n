import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePostArt } from "@/lib/generateAndStore";

// POST /api/posts/:id/generate
// Aciona a automação do Claude Design com o briefing do post, sobe a arte no
// Google Drive (se configurado) e registra a próxima versão. Se a automação não
// estiver configurada, responde 503 para a interface orientar o envio manual.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  // Garante que o post é do cliente do usuário.
  const post = await prisma.post.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Postagem não encontrada" }, { status: 404 });

  const result = await generatePostArt(id);
  if (!result.ok) {
    const status = result.reason === "NOT_CONFIGURED" ? 503 : 502;
    return NextResponse.json({ error: result.error, reason: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, driveUrl: result.driveUrl });
}
