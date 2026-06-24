import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addVersion } from "@/lib/posts";

const schema = z.object({
  imageUrl: z.string().min(1),
  note: z.string().max(2000).optional().nullable(),
});

// POST /api/posts/:id/versions
// Registra uma arte pronta (upload/URL) como a próxima versão do post.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const post = await prisma.post.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true, feedback: true },
  });
  if (!post) return NextResponse.json({ error: "Postagem não encontrada" }, { status: 404 });

  const version = await addVersion({
    postId: id,
    imageUrl: parsed.data.imageUrl,
    source: "UPLOAD",
    note: parsed.data.note ?? post.feedback ?? null,
  });

  return NextResponse.json({ version });
}
