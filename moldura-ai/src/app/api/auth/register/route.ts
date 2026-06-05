import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const schema = z.object({
  dealershipName: z.string().min(2, "Nome da concessionária muito curto"),
  name: z.string().min(2, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha precisa de ao menos 6 caracteres"),
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
  const { dealershipName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma conta com este e-mail" },
      { status: 409 },
    );
  }

  // Build a unique slug for the tenant.
  const base = slugify(dealershipName) || "loja";
  let slug = base;
  let n = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }

  const passwordHash = await hashPassword(password);

  const tenant = await prisma.tenant.create({
    data: {
      name: dealershipName,
      slug,
      users: {
        create: { name, email, passwordHash, role: "OWNER" },
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0];
  await createSession({
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
    email: user.email,
  });

  return NextResponse.json({ ok: true });
}
