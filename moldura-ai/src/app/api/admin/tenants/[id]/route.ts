import { NextResponse } from "next/server";
import { getSuperAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSuperAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;

  // Safety: don't let the admin delete the tenant they're currently logged into.
  if (id === session.tenantId) {
    return NextResponse.json(
      { error: "Você não pode excluir a sua própria loja enquanto está logado nela" },
      { status: 400 },
    );
  }

  // Cascade deletes users, frames and artworks (see schema relations).
  await prisma.tenant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
