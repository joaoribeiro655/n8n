"use strict";

/**
 * LinkedIn — modo HÍBRIDO (sem login, baixo risco).
 *
 * Em vez de raspar o LinkedIn (que exige login e bloqueia robôs), buscamos na
 * web por perfis públicos com a sintaxe `site:linkedin.com/in "Empresa" (cargos)`
 * e extraímos automaticamente nome, cargo e link do perfil do decisor.
 *
 * Usamos o DuckDuckGo HTML (https://html.duckduckgo.com/html/) porque devolve
 * resultados em HTML simples e não exige captcha para volume baixo.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const DEFAULT_TITLES = ["dono", "proprietário", "diretor", "gerente comercial", "gerente"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Link de busca pronto (fallback) caso a coleta automática não ache nada. */
function buildLinkedinSearch(company, titles = DEFAULT_TITLES) {
  if (!company) return "";
  const titleExpr = titles.map((t) => `"${t}"`).join(" OR ");
  const q = `site:linkedin.com/in "${company}" (${titleExpr})`;
  return "https://www.google.com/search?q=" + encodeURIComponent(q);
}

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

/** O DuckDuckGo embrulha o link real em /l/?uddg=<encoded>. Desembrulha. */
function decodeDdgHref(href) {
  const m = href.match(/[?&]uddg=([^&]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return href;
    }
  }
  return href.startsWith("//") ? "https:" + href : href;
}

function parseResults(html) {
  const out = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({ url: decodeDdgHref(m[1]), title: stripTags(m[2]) });
  }
  return out;
}

/** Quebra "Nome - Cargo - Empresa | LinkedIn" em { name, title }. */
function parseNameTitle(titleText) {
  const clean = titleText.replace(/\s*[-–|]\s*LinkedIn.*$/i, "").trim();
  const parts = clean.split(/\s+[-–|]\s+/);
  return { name: (parts[0] || "").trim(), title: (parts[1] || "").trim() };
}

/**
 * Busca decisores de uma empresa. Retorna [{ name, title, profileUrl }].
 * @param {string} company
 * @param {string[]} [titles]
 */
async function findDecisionMakers(company, titles = DEFAULT_TITLES) {
  if (!company) return [];
  const titleExpr = titles.map((t) => `"${t}"`).join(" OR ");
  const q = `site:linkedin.com/in "${company}" (${titleExpr})`;
  const url = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);

  let html = "";
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
    if (!res.ok) return [];
    html = await res.text();
  } catch {
    return [];
  }

  return parseResults(html)
    .filter((r) => /linkedin\.com\/in\//i.test(r.url))
    .slice(0, 3)
    .map((r) => ({ profileUrl: r.url.split("?")[0], ...parseNameTitle(r.title) }));
}

/**
 * Enriquece cada lead com o decisor encontrado (nome, cargo, perfil) e mantém o
 * link de busca como fallback. Faz pausas curtas para ser gentil com a fonte.
 * @param {Array} leads
 * @param {string[]} [titles]
 * @param {Function} [onProgress]
 */
async function enrichLinkedin(leads, titles = DEFAULT_TITLES, onProgress) {
  const targets = leads.filter((l) => l.company);
  let done = 0;
  for (const lead of targets) {
    lead.linkedinSearch = buildLinkedinSearch(lead.company, titles);
    const dms = await findDecisionMakers(lead.company, titles);
    if (dms.length) {
      const best = dms[0];
      if (best.name && !lead.name) lead.name = best.name;
      if (best.title) lead.decisorTitle = best.title;
      lead.linkedinUrl = best.profileUrl;
    }
    onProgress && onProgress(`LinkedIn: ${++done}/${targets.length}…`);
    await sleep(700);
  }
  return leads;
}

module.exports = { buildLinkedinSearch, findDecisionMakers, enrichLinkedin, parseResults, parseNameTitle };
