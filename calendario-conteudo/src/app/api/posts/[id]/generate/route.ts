import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addVersion } from "@/lib/posts";
import { generateArt } from "@/lib/claudeDesign";

// POST /api/posts/:id/generate
// Aciona a automação do Claude Design com o briefing do post e registra a arte
// retornada como a próxima versão. Se a automação não estiver configurada,
// responde 503 para a interface orientar o envio manual.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { tenant: true },
  });
  if (!post) return NextResponse.json({ error: "Postagem não encontrada" }, { status: 404 });

  const result = await generateArt({
    clientName: post.tenant.name,
    clientSlug: post.tenant.slug,
    title: post.title,
    copy: post.copy,
    briefing: post.briefing,
    date: post.date.toISOString(),
    feedback: post.feedback,
    brand: {
      primaryColor: post.tenant.primaryColor,
      logoUrl: post.tenant.logoUrl,
      tagline: post.tenant.tagline,
    },
  });

  if (!result.ok) {
    const status = result.reason === "NOT_CONFIGURED" ? 503 : 502;
    return NextResponse.json({ error: result.error, reason: result.reason }, { status });
  }

  const version = await addVersion({
    postId: id,
    imageUrl: result.imageUrl,
    source: "AUTO",
    note: result.note ?? post.feedback ?? null,
  });

  return NextResponse.json({ version });
}
