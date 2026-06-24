import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/posts?month=YYYY-MM
// Lista os posts do cliente atual num mês (padrão: todos).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    dateFilter = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }

  const posts = await prisma.post.findMany({
    where: { tenantId: session.tenantId, ...(dateFilter ? { date: dateFilter } : {}) },
    orderBy: { date: "asc" },
    include: { versions: { orderBy: { version: "desc" } } },
  });
  return NextResponse.json({ posts });
}

const schema = z.object({
  date: z.string().min(1),
  title: z.string().max(120).optional().nullable(),
  copy: z.string().max(5000).optional(),
  briefing: z.string().max(5000).optional(),
  photoUrl: z.string().optional().nullable(),
  template: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const date = new Date(parsed.data.date);
  if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Data inválida" }, { status: 400 });

  const post = await prisma.post.create({
    data: {
      date,
      title: parsed.data.title ?? null,
      copy: parsed.data.copy ?? "",
      briefing: parsed.data.briefing ?? "",
      photoUrl: parsed.data.photoUrl ?? null,
      template: parsed.data.template ?? "CLASSIC",
      tenantId: session.tenantId,
      createdById: session.userId,
    },
    include: { versions: true },
  });
  return NextResponse.json({ post });
}
