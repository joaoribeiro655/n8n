import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");

const schema = z.object({
  name: z.string().min(2).optional(),
  primaryColor: hex.optional(),
  secondaryColor: hex.optional(),
  accentColor: hex.optional(),
  textColor: hex.optional(),
  fontFamily: z.string().min(1).optional(),
  logoUrl: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
});

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const tenant = await prisma.tenant.update({
    where: { id: session.tenantId },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, tenant });
}
