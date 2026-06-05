import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const frames = await prisma.frame.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ frames });
}

const schema = z.object({
  name: z.string().min(1),
  imageUrl: z.string().min(1),
  width: z.number().int().positive().default(1080),
  height: z.number().int().positive().default(1080),
  slotX: z.number().min(0).max(1).default(0),
  slotY: z.number().min(0).max(1).default(0),
  slotW: z.number().min(0).max(1).default(1),
  slotH: z.number().min(0).max(1).default(1),
  source: z.enum(["IMPORTED", "GENERATED"]).default("IMPORTED"),
});

export async function POST(req: Request) {
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

  const frame = await prisma.frame.create({
    data: { ...parsed.data, tenantId: session.tenantId },
  });
  return NextResponse.json({ frame });
}
