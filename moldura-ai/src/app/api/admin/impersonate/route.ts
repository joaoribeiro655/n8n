import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminSession, createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ tenantId: z.string().min(1) });

// Start managing another tenant as the platform super-admin.
export async function POST(req: Request) {
  const session = await getSuperAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Loja inválida" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: parsed.data.tenantId } });
  if (!tenant) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });

  // Keep the admin identity, but act inside the target tenant with owner rights.
  await createSession({
    userId: session.userId,
    tenantId: tenant.id,
    role: "OWNER",
    email: session.email,
    isSuperAdmin: true,
    impersonating: true,
  });

  return NextResponse.json({ ok: true, tenant: { id: tenant.id, name: tenant.name } });
}
