import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

const schema = z.object({
  clientName: z.string().min(2).max(80),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(200),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });

  // Garante um slug único para o cliente.
  const base = slugify(parsed.data.clientName) || "cliente";
  let slug = base;
  for (let i = 2; await prisma.tenant.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }

  const tenant = await prisma.tenant.create({
    data: { slug, name: parsed.data.clientName },
  });

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
      role: "OWNER",
      tenantId: tenant.id,
    },
  });

  await createSession({
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
    email: user.email,
  });

  return NextResponse.json({ ok: true });
}
