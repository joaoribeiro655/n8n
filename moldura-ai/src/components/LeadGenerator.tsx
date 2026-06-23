"use client";

import { useMemo, useState } from "react";

type Lead = {
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  seniority: string;
  email: string;
  emailStatus: string;
  linkedinUrl: string;
  personLocation: string;
  company: string;
  companyDomain: string;
  companyWebsite: string;
  companyIndustry: string;
  companySize: string;
  companyLocation: string;
  companyPhone: string;
};

// Opções de senioridade aceitas pelo Apollo.
const SENIORITIES = [
  { value: "owner", label: "Dono" },
  { value: "founder", label: "Fundador" },
  { value: "c_suite", label: "Diretoria (C-level)" },
  { value: "vp", label: "VP" },
  { value: "head", label: "Head" },
  { value: "director", label: "Diretor" },
  { value: "manager", label: "Gerente" },
  { value: "senior", label: "Sênior" },
];

const COMPANY_SIZES = [
  { value: "1,10", label: "1–10" },
  { value: "11,50", label: "11–50" },
  { value: "51,200", label: "51–200" },
  { value: "201,500", label: "201–500" },
  { value: "501,1000", label: "501–1000" },
];

const EMAIL_STATUS = [
  { value: "verified", label: "Verificado" },
  { value: "likely to engage", label: "Provável" },
];

// Pré-preenchido para o ICP do Moldura.AI (concessionárias no Brasil).
const DEFAULTS = {
  titles: "dono, proprietário, diretor, gerente comercial, gerente de marketing",
  personLocations: "Brazil",
  companyLocations: "Brazil",
  industryKeywords: "car dealership, automotive, concessionária",
  keywords: "",
};

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function csvEscape(value: string): string {
  if (value == null) return "";
  const needs = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needs ? `"${escaped}"` : escaped;
}

const CSV_COLUMNS: Array<[string, (l: Lead) => string]> = [
  ["nome", (l) => l.name],
  ["cargo", (l) => l.title],
  ["email", (l) => l.email],
  ["status_email", (l) => l.emailStatus],
  ["linkedin", (l) => l.linkedinUrl],
  ["empresa", (l) => l.company],
  ["site", (l) => l.companyWebsite],
  ["setor", (l) => l.companyIndustry],
  ["tamanho_empresa", (l) => l.companySize],
  ["localizacao_empresa", (l) => l.companyLocation],
  ["localizacao_pessoa", (l) => l.personLocation],
  ["telefone_empresa", (l) => l.companyPhone],
];

function downloadCsv(leads: Lead[]) {
  const header = CSV_COLUMNS.map(([h]) => h).join(",");
  const rows = leads.map((l) => CSV_COLUMNS.map(([, get]) => csvEscape(get(l))).join(","));
  const content = "﻿" + [header, ...rows].join("\r\n") + "\r\n";
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `leads-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadGenerator() {
  const [titles, setTitles] = useState(DEFAULTS.titles);
  const [seniorities, setSeniorities] = useState<string[]>(["owner", "director", "manager"]);
  const [personLocations, setPersonLocations] = useState(DEFAULTS.personLocations);
  const [companyLocations, setCompanyLocations] = useState(DEFAULTS.companyLocations);
  const [industryKeywords, setIndustryKeywords] = useState(DEFAULTS.industryKeywords);
  const [companySizes, setCompanySizes] = useState<string[]>(["1,10", "11,50", "51,200"]);
  const [emailStatus, setEmailStatus] = useState<string[]>(["verified"]);
  const [keywords, setKeywords] = useState(DEFAULTS.keywords);
  const [limit, setLimit] = useState(100);
  const [enrich, setEnrich] = useState(false);
  const [revealPersonal, setRevealPersonal] = useState(false);

  const [loading, setLoading] = useState<"idle" | "count" | "run">("idle");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [marketSize, setMarketSize] = useState<number | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function buildPayload(extra: Record<string, unknown> = {}) {
    return {
      titles: splitList(titles),
      seniorities,
      personLocations: splitList(personLocations),
      companyLocations: splitList(companyLocations),
      industryKeywords: splitList(industryKeywords),
      companySizes,
      emailStatus,
      keywords: splitList(keywords),
      limit,
      enrich,
      revealPersonalEmails: revealPersonal,
      ...extra,
    };
  }

  async function call(payload: Record<string, unknown>) {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Falha na requisição");
    return data;
  }

  async function checkMarket() {
    setLoading("count");
    setError(null);
    setInfo(null);
    try {
      const data = await call(buildPayload({ dryRun: true }));
      setMarketSize(data.totalEntries ?? 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("idle");
    }
  }

  async function generate() {
    if (enrich) {
      const ok = window.confirm(
        `Você marcou "revelar e-mails". Isso consome até ${limit} créditos do Apollo (1 por contato encontrado). Deseja continuar?`,
      );
      if (!ok) return;
    }
    setLoading("run");
    setError(null);
    setInfo(null);
    setLeads([]);
    try {
      const data = await call(buildPayload());
      setLeads(data.leads ?? []);
      setMarketSize(data.totalEntries ?? null);
      const withEmail = (data.leads ?? []).filter((l: Lead) => l.email).length;
      setInfo(
        `${data.leads?.length ?? 0} leads gerados · ${withEmail} com e-mail` +
          (data.enriched ? ` · ${data.enriched} enriquecidos` : ""),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("idle");
    }
  }

  const busy = loading !== "idle";
  const withEmail = useMemo(() => leads.filter((l) => l.email).length, [leads]);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* Painel de filtros */}
      <div className="space-y-6">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Filtros do público (ICP)</h2>

          <div>
            <label className="label">Cargos (separe por vírgula)</label>
            <input className="input" value={titles} onChange={(e) => setTitles(e.target.value)} placeholder="dono, gerente comercial" />
          </div>

          <div>
            <label className="label">Senioridade</label>
            <div className="flex flex-wrap gap-2">
              {SENIORITIES.map((s) => (
                <Chip key={s.value} active={seniorities.includes(s.value)} onClick={() => toggle(seniorities, setSeniorities, s.value)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Setor / palavras-chave da empresa</label>
            <input className="input" value={industryKeywords} onChange={(e) => setIndustryKeywords(e.target.value)} placeholder="car dealership, automotive" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Local da pessoa</label>
              <input className="input" value={personLocations} onChange={(e) => setPersonLocations(e.target.value)} placeholder="Brazil" />
            </div>
            <div>
              <label className="label">Local da empresa</label>
              <input className="input" value={companyLocations} onChange={(e) => setCompanyLocations(e.target.value)} placeholder="Brazil" />
            </div>
          </div>

          <div>
            <label className="label">Tamanho da empresa (funcionários)</label>
            <div className="flex flex-wrap gap-2">
              {COMPANY_SIZES.map((s) => (
                <Chip key={s.value} active={companySizes.includes(s.value)} onClick={() => toggle(companySizes, setCompanySizes, s.value)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Status de e-mail</label>
            <div className="flex flex-wrap gap-2">
              {EMAIL_STATUS.map((s) => (
                <Chip key={s.value} active={emailStatus.includes(s.value)} onClick={() => toggle(emailStatus, setEmailStatus, s.value)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Busca livre (opcional)</label>
            <input className="input" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="ex.: seminovos" />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Geração</h2>
          <div>
            <label className="label">Quantidade de leads (máx. 500)</label>
            <input
              type="number"
              min={1}
              max={500}
              className="input"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
            <input type="checkbox" className="mt-1" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} />
            <span className="text-sm">
              <span className="font-medium text-gray-200">Revelar e-mails</span>
              <span className="block text-xs text-amber-300/90">⚠️ Consome créditos do Apollo (1 por contato encontrado).</span>
            </span>
          </label>

          {enrich && (
            <label className="flex items-center gap-3 pl-1 text-sm text-gray-300">
              <input type="checkbox" checked={revealPersonal} onChange={(e) => setRevealPersonal(e.target.checked)} />
              Incluir e-mails pessoais
            </label>
          )}

          <div className="flex flex-col gap-2">
            <button className="btn-ghost" onClick={checkMarket} disabled={busy}>
              {loading === "count" ? "Consultando…" : "Ver tamanho do mercado (grátis)"}
            </button>
            <button className="btn-primary" onClick={generate} disabled={busy}>
              {loading === "run" ? "Gerando lista…" : "Gerar lista"}
            </button>
          </div>

          {marketSize !== null && (
            <p className="text-sm text-gray-300">
              📊 Mercado estimado: <strong>{marketSize.toLocaleString("pt-BR")}</strong> pessoas para esse ICP.
            </p>
          )}
          {info && <p className="text-sm text-emerald-300">{info}</p>}
          {error && <p className="text-sm text-red-300">❌ {error}</p>}
        </div>
      </div>

      {/* Resultados */}
      <div className="card overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Resultados</h2>
            <p className="text-xs text-gray-500">
              {leads.length > 0 ? `${leads.length} leads · ${withEmail} com e-mail` : "Defina os filtros e clique em “Gerar lista”."}
            </p>
          </div>
          <button className="btn-primary" onClick={() => downloadCsv(leads)} disabled={leads.length === 0}>
            ⬇ Baixar CSV
          </button>
        </div>

        {leads.length === 0 ? (
          <div className="grid h-64 place-items-center rounded-xl border border-dashed border-white/10 text-sm text-gray-500">
            Nenhum lead ainda.
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-black/60 text-xs uppercase tracking-wide text-gray-400 backdrop-blur">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Cargo</th>
                  <th className="px-3 py-2">Empresa</th>
                  <th className="px-3 py-2">E-mail</th>
                  <th className="px-3 py-2">Local</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l, i) => (
                  <tr key={`${l.linkedinUrl}-${i}`} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="px-3 py-2">
                      {l.linkedinUrl ? (
                        <a href={l.linkedinUrl} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">
                          {l.name || "—"}
                        </a>
                      ) : (
                        l.name || "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-300">{l.title || "—"}</td>
                    <td className="px-3 py-2 text-gray-300">{l.company || "—"}</td>
                    <td className="px-3 py-2 text-gray-300">
                      {l.email ? (
                        l.email
                      ) : (
                        <span className="text-xs text-gray-600">enriqueça p/ revelar</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400">{l.companyLocation || l.personLocation || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-sky-500/50 bg-sky-500/15 text-sky-200"
          : "border-white/10 bg-white/5 text-gray-400 hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
