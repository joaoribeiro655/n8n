import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  date: z.string().optional(),
  title: z.string().max(120).nullable().optional(),
  copy: z.string().max(5000).optional(),
  frameId: z.string().nullable().optional(),
  // Status transitions driven by the review loop.
  status: z.enum(["PLANNED", "GENERATED", "APPROVED", "REJECTED"]).optional(),
  feedback: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  // Ensure the post belongs to the caller's tenant.
  const existing = await prisma.post.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Postagem não encontrada" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (parsed.data.date !== undefined) {
    const d = new Date(parsed.data.date);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    data.date = d;
  }
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.copy !== undefined) data.copy = parsed.data.copy;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.feedback !== undefined) data.feedback = parsed.data.feedback;
  if (parsed.data.frameId !== undefined) {
    if (parsed.data.frameId) {
      const frame = await prisma.frame.findFirst({
        where: { id: parsed.data.frameId, tenantId: session.tenantId },
        select: { id: true },
      });
      if (!frame) return NextResponse.json({ error: "Moldura não encontrada" }, { status: 400 });
    }
    data.frameId = parsed.data.frameId;
  }

  const post = await prisma.post.update({
    where: { id },
    data,
    include: { versions: { orderBy: { version: "desc" } } },
  });
  return NextResponse.json({ post });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const result = await prisma.post.deleteMany({
    where: { id, tenantId: session.tenantId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Postagem não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
