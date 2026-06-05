import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const artworks = await prisma.artwork.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ artworks });
}

const schema = z.object({
  imageUrl: z.string().min(1),
  frameId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const artwork = await prisma.artwork.create({
    data: {
      imageUrl: parsed.data.imageUrl,
      frameId: parsed.data.frameId ?? null,
      tenantId: session.tenantId,
      createdById: session.userId,
    },
  });
  return NextResponse.json({ artwork });
}
