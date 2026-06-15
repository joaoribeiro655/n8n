#!/usr/bin/env node
// RevOps puller para o Growth da Opens (Opens Growth Hub).
//
// Bate nas Edge Functions do Supabase (query-deals / query-activities) e
// monta um resumo de RevOps: pipeline em aberto, win rate, ticket médio,
// quebra por etapa/funil/tipo e atividade do time.
//
// Uso:
//   node revops-growth/growth-revops.mjs
//   node revops-growth/growth-revops.mjs --from 2026-01-01 --to 2026-03-31 --json
//
// Variáveis de ambiente (opcionais — a API também aceita modo público):
//   GROWTH_BASE_URL   default: https://cydbkzvfojvmtxmurxwq.supabase.co/functions/v1
//   GROWTH_API_KEY    enviado como header `x-api-key` quando definido
//   GROWTH_TOKEN      enviado como `Authorization: Bearer <token>` quando definido

const BASE_URL = (
  process.env.GROWTH_BASE_URL ||
  'https://cydbkzvfojvmtxmurxwq.supabase.co/functions/v1'
).replace(/\/$/, '');

function parseArgs(argv) {
  const args = { json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--from') args.from = argv[++i];
    else if (a === '--to') args.to = argv[++i];
    else if (a === '--limit') args.limit = Number(argv[++i]);
  }
  return args;
}

function authHeaders() {
  const headers = { Accept: 'application/json' };
  if (process.env.GROWTH_API_KEY) headers['x-api-key'] = process.env.GROWTH_API_KEY;
  if (process.env.GROWTH_TOKEN) headers['Authorization'] = `Bearer ${process.env.GROWTH_TOKEN}`;
  return headers;
}

// Busca paginada de um endpoint até esgotar os resultados.
async function fetchAll(path, params = {}, pageSize = 100) {
  const all = [];
  let offset = 0;
  for (;;) {
    const url = new URL(`${BASE_URL}/${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('offset', String(offset));

    let res;
    try {
      res = await fetch(url, { headers: authHeaders() });
    } catch (err) {
      throw new Error(
        `Falha de rede ao acessar ${url.host}: ${err.message}\n` +
          `→ Provavelmente o host não está na allowlist de egress do ambiente.\n` +
          `  Libere "${url.host}" nas settings de rede do ambiente e rode de novo.`,
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} em ${path}: ${body.slice(0, 300)}`);
    }
    const payload = await res.json();
    const batch = payload.data ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

const brl = (n) =>
  (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function groupSum(rows, keyFn, valFn) {
  const map = new Map();
  for (const r of rows) {
    const key = keyFn(r) ?? '—';
    const cur = map.get(key) || { count: 0, value: 0 };
    cur.count += 1;
    cur.value += valFn(r) || 0;
    map.set(key, cur);
  }
  return [...map.entries()].sort((a, b) => b[1].value - a[1].value);
}

function buildReport(deals, activities) {
  const open = deals.filter((d) => d.win === null || d.win === undefined);
  const won = deals.filter((d) => d.win === true);
  const lost = deals.filter((d) => d.win === false);
  const closed = won.length + lost.length;

  const sum = (rows) => rows.reduce((acc, d) => acc + (d.value || 0), 0);
  const openValue = sum(open);
  const wonValue = sum(won);
  const winRate = closed ? (won.length / closed) * 100 : 0;
  const avgTicket = won.length ? wonValue / won.length : 0;

  return {
    totals: {
      deals: deals.length,
      open: open.length,
      won: won.length,
      lost: lost.length,
      openValue,
      wonValue,
      winRatePct: Number(winRate.toFixed(1)),
      avgTicket,
    },
    pipelineByStage: groupSum(open, (d) => d.stage?.name, (d) => d.value),
    byDealType: groupSum(deals, (d) => d.deal_type, (d) => d.value),
    openByOwner: groupSum(open, (d) => d.owner?.full_name, (d) => d.value),
    activities: {
      total: activities.length,
      byStatus: groupSum(activities, (a) => a.status, () => 0),
      byUser: groupSum(activities, (a) => a.user?.full_name, () => 0),
    },
  };
}

function printReport(r) {
  const t = r.totals;
  console.log('\n=== RevOps — Growth da Opens ===\n');
  console.log(`Oportunidades:      ${t.deals}`);
  console.log(`  Abertas:          ${t.open}  (${brl(t.openValue)} em pipeline)`);
  console.log(`  Ganhas:           ${t.won}  (${brl(t.wonValue)})`);
  console.log(`  Perdidas:         ${t.lost}`);
  console.log(`Win rate:           ${t.winRatePct}%`);
  console.log(`Ticket médio (won): ${brl(t.avgTicket)}\n`);

  const table = (title, rows) => {
    console.log(`-- ${title} --`);
    if (!rows.length) console.log('  (sem dados)');
    for (const [k, v] of rows) {
      console.log(`  ${String(k).padEnd(28)} ${String(v.count).padStart(4)}  ${brl(v.value)}`);
    }
    console.log('');
  };

  table('Pipeline aberto por etapa', r.pipelineByStage);
  table('Por tipo de deal', r.byDealType);
  table('Pipeline aberto por responsável', r.openByOwner);

  console.log(`-- Atividades (${r.activities.total}) --`);
  for (const [k, v] of r.activities.byUser) {
    console.log(`  ${String(k).padEnd(28)} ${String(v.count).padStart(4)}`);
  }
  console.log('');
}

async function main() {
  const args = parseArgs(process.argv);
  console.error(`> Consultando Growth em ${BASE_URL} ...`);

  const dealParams = {};
  const actParams = {};
  if (args.from) actParams.date_from = args.from;
  if (args.to) actParams.date_to = args.to;

  const [deals, activities] = await Promise.all([
    fetchAll('query-deals', dealParams),
    fetchAll('query-activities', actParams),
  ]);

  console.error(`> ${deals.length} oportunidades, ${activities.length} atividades.\n`);

  const report = buildReport(deals, activities);
  if (args.json) {
    console.log(JSON.stringify({ report, deals, activities }, null, 2));
  } else {
    printReport(report);
  }
}

main().catch((err) => {
  console.error(`\n[erro] ${err.message}\n`);
  process.exit(1);
});
