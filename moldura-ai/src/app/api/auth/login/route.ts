import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "E-mail ou senha incorretos" },
      { status: 401 },
    );
  }

  // Bootstrap: the email in SUPER_ADMIN_EMAIL is auto-promoted to platform admin.
  const superEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  if (superEmail && user.email.toLowerCase() === superEmail && !user.isSuperAdmin) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { isSuperAdmin: true },
    });
  }

  await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
  });

  return NextResponse.json({ ok: true });
}
