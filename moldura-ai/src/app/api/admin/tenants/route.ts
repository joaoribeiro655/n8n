import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await getSuperAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, frames: true, artworks: true } },
      users: {
        where: { role: "OWNER" },
        select: { name: true, email: true },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    tenants: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      logoUrl: t.logoUrl,
      primaryColor: t.primaryColor,
      createdAt: t.createdAt.toISOString(),
      owner: t.users[0] ?? null,
      counts: t._count,
    })),
  });
}

const schema = z.object({
  dealershipName: z.string().min(2, "Nome da concessionária muito curto"),
  ownerName: z.string().min(2, "Informe o nome do responsável"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha de ao menos 6 caracteres"),
});

export async function POST(req: Request) {
  const session = await getSuperAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }
  const { dealershipName, ownerName, email, password } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }

  const base = slugify(dealershipName) || "loja";
  let slug = base;
  let n = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: dealershipName,
      slug,
      users: {
        create: {
          name: ownerName,
          email,
          passwordHash: await hashPassword(password),
          role: "OWNER",
        },
      },
    },
  });

  return NextResponse.json({ tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } });
}
