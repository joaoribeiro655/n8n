import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  imageUrl: z.string().min(1),
  note: z.string().max(2000).optional().nullable(),
});

// POST /api/posts/:id/versions
// Registers a freshly generated art as the next version (v1, v2, v3...) and
// flips the post to GENERATED, ready for review.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const post = await prisma.post.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!post) return NextResponse.json({ error: "Postagem não encontrada" }, { status: 404 });

  const nextVersion = (post.versions[0]?.version ?? 0) + 1;

  const [version] = await prisma.$transaction([
    prisma.postVersion.create({
      data: {
        postId: id,
        version: nextVersion,
        imageUrl: parsed.data.imageUrl,
        note: parsed.data.note ?? post.feedback ?? null,
      },
    }),
    prisma.post.update({
      where: { id },
      data: { status: "GENERATED" },
    }),
  ]);

  return NextResponse.json({ version });
}
