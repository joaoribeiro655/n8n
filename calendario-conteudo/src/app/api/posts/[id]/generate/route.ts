import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePostArt } from "@/lib/generateAndStore";

// POST /api/posts/:id/generate
// Renderiza a arte do post na plataforma (brand guide do cliente) e registra a
// próxima versão na galeria. Sem serviços externos.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Postagem não encontrada" }, { status: 404 });

  const result = await generatePostArt(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, imageUrl: result.imageUrl });
}
