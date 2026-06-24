import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePostDesign } from "@/lib/generateAndStore";

export const maxDuration = 120;

// POST /api/posts/:id/generate
// Gera o design do post com o Claude Design (HTML on-brand) e o guarda no post.
// A conversão para PNG é feita no navegador (exportador).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Postagem não encontrada" }, { status: 404 });

  const result = await generatePostDesign(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, designHtml: result.designHtml });
}
