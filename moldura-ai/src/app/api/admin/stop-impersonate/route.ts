import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Return the super-admin back to their own tenant.
export async function POST() {
  const session = await getSession();
  if (!session || !session.isSuperAdmin) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
    isSuperAdmin: true,
    impersonating: false,
  });

  return NextResponse.json({ ok: true });
}
