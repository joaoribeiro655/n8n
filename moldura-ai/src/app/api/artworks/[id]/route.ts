import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const result = await prisma.artwork.deleteMany({
    where: { id, tenantId: session.tenantId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Arte não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
