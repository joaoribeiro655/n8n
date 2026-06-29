"use strict";

/**
 * LinkedIn — modo HÍBRIDO (sem login, baixo risco).
 *
 * Busca perfis públicos com `site:linkedin.com/in "Empresa" (cargos)` num
 * mecanismo de busca e extrai nome, cargo e link do perfil do decisor.
 *
 * A BUSCA em si é injetada (searchHtml) — no app real ela roda dentro do
 * Chromium do Electron (navegador de verdade, não bloqueado). Se nenhuma
 * função for injetada, cai num fetch simples como fallback.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const DEFAULT_TITLES = ["dono", "proprietário", "diretor", "gerente comercial", "gerente"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildQuery(company, titles = DEFAULT_TITLES) {
  const titleExpr = titles.map((t) => `"${t}"`).join(" OR ");
  return `site:linkedin.com/in "${company}" (${titleExpr})`;
}

/** Link de busca pronto (fallback) caso a coleta automática não ache nada. */
function buildLinkedinSearch(company, titles = DEFAULT_TITLES) {
  if (!company) return "";
  return "https://www.google.com/search?q=" + encodeURIComponent(buildQuery(company, titles));
}

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Desembrulha redirecionadores comuns (DuckDuckGo /l/?uddg=, // relativo). */
function decodeHref(href) {
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

function cleanUrl(u) {
  return u.split("?")[0].split("#")[0].replace(/\/$/, "");
}

/** Quebra "Nome - Cargo - Empresa | LinkedIn" em { name, title }. */
function parseNameTitle(titleText) {
  const clean = titleText.replace(/\s*[-–|]\s*LinkedIn.*$/i, "").trim();
  const parts = clean.split(/\s+[-–|]\s+/);
  return { name: (parts[0] || "").trim(), title: (parts[1] || "").trim() };
}

/**
 * Extrai perfis (URL + nome + cargo) de QUALQUER HTML de busca.
 * 1) Pega âncoras cujo href aponta para linkedin.com/in (com nome/cargo no texto).
 * 2) Complementa com URLs cruas de perfil achadas no HTML (sem texto).
 */
function extractProfiles(html) {
  const profiles = new Map();

  const reA = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = reA.exec(html))) {
    const href = decodeHref(m[1]);
    if (!/linkedin\.com\/in\//i.test(href)) continue;
    const url = cleanUrl(href);
    const info = parseNameTitle(stripTags(m[2]));
    const prev = profiles.get(url);
    if (!prev || (info.name && !prev.name)) profiles.set(url, info);
  }

  const reU = /https?:\/\/[a-z]{2,3}\.linkedin\.com\/in\/[A-Za-z0-9\-_%.]+/gi;
  while ((m = reU.exec(html))) {
    const url = cleanUrl(decodeHref(m[0]));
    if (!profiles.has(url)) profiles.set(url, { name: "", title: "" });
  }

  return [...profiles.entries()].slice(0, 3).map(([profileUrl, v]) => ({ profileUrl, ...v }));
}

/** Fallback de busca por fetch (menos confiável; usado só se searchHtml faltar). */
async function fetchSearchHtml(query) {
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
      body: "q=" + encodeURIComponent(query) + "&kl=br-pt",
    });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

/** Busca os decisores de uma empresa. Retorna [{ name, title, profileUrl }]. */
async function findDecisionMakers(company, titles = DEFAULT_TITLES, searchHtml = fetchSearchHtml) {
  if (!company) return [];
  const html = await searchHtml(buildQuery(company, titles));
  if (!html) return [];
  return extractProfiles(html);
}

/**
 * Enriquece cada lead com o decisor encontrado (nome, cargo, perfil) e mantém o
 * link de busca como fallback.
 * @param {Array} leads
 * @param {{titles?:string[], searchHtml?:Function, onProgress?:Function}} [opts]
 */
async function enrichLinkedin(leads, opts = {}) {
  const { titles = DEFAULT_TITLES, searchHtml = fetchSearchHtml, onProgress } = opts;
  const targets = leads.filter((l) => l.company);
  let done = 0;
  let achados = 0;
  for (const lead of targets) {
    lead.linkedinSearch = buildLinkedinSearch(lead.company, titles);
    try {
      const dms = await findDecisionMakers(lead.company, titles, searchHtml);
      if (dms.length) {
        const best = dms[0];
        if (best.name && !lead.name) lead.name = best.name;
        if (best.title) lead.decisorTitle = best.title;
        lead.linkedinUrl = best.profileUrl;
        achados++;
      }
    } catch {
      /* segue para o próximo */
    }
    onProgress && onProgress(`LinkedIn: ${++done}/${targets.length} (${achados} decisores)…`);
    await sleep(500);
  }
  return leads;
}

module.exports = {
  buildQuery,
  buildLinkedinSearch,
  extractProfiles,
  parseNameTitle,
  findDecisionMakers,
  enrichLinkedin,
};
