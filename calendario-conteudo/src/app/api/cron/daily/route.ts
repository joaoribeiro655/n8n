import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePostDesign } from "@/lib/generateAndStore";

// GET/POST /api/cron/daily
// Robô diário: 1 dia antes, gera a arte dos posts do dia seguinte (de todos os
// clientes) e sobe no Google Drive. As artes ficam aguardando aprovação.
//
// Disparado pelo Vercel Cron (ver vercel.json). Protegido por CRON_SECRET:
// a Vercel envia o header "Authorization: Bearer <CRON_SECRET>" automaticamente
// quando a variável CRON_SECRET existe.

export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sem segredo definido: liberado (apenas dev)
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function run() {
  // Janela do "dia seguinte" no horário do servidor.
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

  // Só posts ainda sem arte (PLANNED). Os já gerados/aprovados são ignorados.
  const posts = await prisma.post.findMany({
    where: { date: { gte: start, lt: end }, status: "PLANNED" },
    select: { id: true },
  });

  const results: { postId: string; ok: boolean; error?: string }[] = [];
  for (const p of posts) {
    const r = await generatePostDesign(p.id);
    results.push(r.ok ? { postId: p.id, ok: true } : { postId: p.id, ok: false, error: r.error });
  }

  return {
    date: start.toISOString().slice(0, 10),
    total: posts.length,
    generated: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok),
  };
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json(await run());
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json(await run());
}
