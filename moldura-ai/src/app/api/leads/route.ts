import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { ApolloError, countPeople, enrichEmails, searchPeople, type Icp } from "@/lib/apollo";

// A busca + enriquecimento pode demorar; deixe a função rodar mais tempo.
export const maxDuration = 60;

const strList = z.array(z.string().trim().min(1)).max(50).optional();

const schema = z.object({
  titles: strList,
  seniorities: strList,
  personLocations: strList,
  companyLocations: strList,
  industryKeywords: strList,
  companySizes: strList,
  companyDomains: strList,
  keywords: strList,
  emailStatus: strList,
  limit: z.number().int().min(1).max(500).default(100),
  enrich: z.boolean().default(false),
  revealPersonalEmails: z.boolean().default(false),
  dryRun: z.boolean().default(false),
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

  const { limit, enrich, revealPersonalEmails, dryRun, ...rest } = parsed.data;
  const icp: Icp = rest;

  // Exige pelo menos um filtro para não puxar a base inteira.
  const hasFilter = Object.values(icp).some((v) => Array.isArray(v) && v.length > 0);
  if (!hasFilter) {
    return NextResponse.json(
      { error: "Defina ao menos um filtro (cargo, setor, localização…)." },
      { status: 400 },
    );
  }

  try {
    if (dryRun) {
      const totalEntries = await countPeople(icp);
      return NextResponse.json({ ok: true, dryRun: true, totalEntries });
    }

    const { leads, totalEntries } = await searchPeople(icp, limit);

    let enriched = 0;
    if (enrich && leads.length > 0) {
      enriched = await enrichEmails(leads, revealPersonalEmails);
    }

    return NextResponse.json({ ok: true, leads, totalEntries, enriched });
  } catch (err) {
    if (err instanceof ApolloError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("Erro ao gerar leads:", err);
    return NextResponse.json({ error: "Erro inesperado ao gerar a lista." }, { status: 500 });
  }
}
