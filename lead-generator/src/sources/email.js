"use strict";

/**
 * Descoberta de e-mail do decisor por padrão (nome + domínio da empresa).
 * Não há verificação 100% grátis e confiável de existência de caixa, então:
 *  - geramos os padrões mais comuns (first.last@, first@, flast@, …);
 *  - confirmamos que o domínio RECEBE e-mail (registro MX via DNS);
 *  - devolvemos o padrão mais provável, marcado como "provável" no app.
 */

const dns = require("node:dns").promises;

const STOPWORDS = new Set(["de", "da", "do", "dos", "das", "e", "jr", "filho", "neto"]);

function stripAccents(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function nameParts(fullName) {
  const clean = stripAccents(String(fullName).toLowerCase()).replace(/[^a-z\s]/g, " ");
  return clean
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p && !STOPWORDS.has(p));
}

function domainFromUrl(website) {
  if (!website) return "";
  try {
    const u = new URL(/^https?:/.test(website) ? website : "https://" + website);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Gera candidatos de e-mail, do mais provável para o menos provável. */
function guessEmails(fullName, domain) {
  const parts = nameParts(fullName);
  if (!parts.length || !domain) return [];
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const fi = first[0];

  const cands = [];
  if (last) {
    cands.push(`${first}.${last}@${domain}`);
    cands.push(`${first}${last}@${domain}`);
    cands.push(`${fi}${last}@${domain}`);
    cands.push(`${first}@${domain}`);
    cands.push(`${first}_${last}@${domain}`);
    cands.push(`${fi}.${last}@${domain}`);
  } else {
    cands.push(`${first}@${domain}`);
  }
  return [...new Set(cands)];
}

/** Confirma que o domínio tem servidor de e-mail (registro MX). */
async function hasMx(domain) {
  if (!domain) return false;
  try {
    const recs = await dns.resolveMx(domain);
    return Array.isArray(recs) && recs.length > 0;
  } catch {
    return false;
  }
}

/** Retorna o e-mail provável (padrão mais comum) se o domínio recebe e-mail. */
async function bestGuessEmail(fullName, domain) {
  const cands = guessEmails(fullName, domain);
  if (!cands.length) return "";
  const ok = await hasMx(domain);
  return ok ? cands[0] : "";
}

// E-mails "de papel" (caixas genéricas da empresa, não de uma pessoa).
const GENERIC =
  /^(contato|contact|vendas|comercial|atendimento|sac|faleconosco|fale|financeiro|info|adm|administrativo|administracao|suporte|support|faq|newsletter|marketing|rh|recursoshumanos|hello|ola|oi|cadastro|orcamento|orcamentos|loja|compras)@/i;

/**
 * Classifica um e-mail em relação ao decisor:
 *   decisor          – bate nome E sobrenome do decisor
 *   decisor-possivel – bate o primeiro nome do decisor
 *   pessoal          – parece de pessoa (nome.sobrenome), mas não sabemos quem
 *   generico         – caixa "de papel" (contato@, sac@…)
 *   outro            – não classificado
 */
function classifyEmail(email, parts) {
  const local = String(email).split("@")[0].toLowerCase();
  const norm = local.replace(/[^a-z]/g, "");
  if (parts && parts.length) {
    const first = parts[0];
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    if (first && last && norm.includes(first) && norm.includes(last)) return "decisor";
    if (first && first.length >= 4 && norm.includes(first)) return "decisor-possivel";
  }
  if (GENERIC.test(email)) return "generico";
  if (/^[a-z]+[._][a-z]+@/i.test(email) && !/\d/.test(local)) return "pessoal";
  return "outro";
}

/**
 * Escolhe o melhor e-mail de uma lista, priorizando o do decisor.
 * @param {string[]} emails
 * @param {string} fullName  nome do decisor (se conhecido)
 * @param {object} opts
 * @param {boolean} opts.strictDecisor  se true, descarta genéricos de vez
 * @returns {{email:string, kind:string}}
 */
function pickBestEmail(emails, fullName, { strictDecisor = false } = {}) {
  if (!Array.isArray(emails) || !emails.length) return { email: "", kind: "" };
  const parts = fullName ? nameParts(fullName) : [];
  const RANK = {
    decisor: 6,
    "decisor-possivel": 5,
    pessoal: 4,
    outro: 3,
    generico: 1,
  };
  let best = null;
  for (const email of emails) {
    const kind = classifyEmail(email, parts);
    if (strictDecisor && (kind === "generico" || kind === "outro")) continue;
    const r = RANK[kind] ?? 2;
    if (!best || r > best.r) best = { email, kind, r };
  }
  return best ? { email: best.email, kind: best.kind } : { email: "", kind: "" };
}

module.exports = {
  guessEmails,
  hasMx,
  bestGuessEmail,
  domainFromUrl,
  nameParts,
  classifyEmail,
  pickBestEmail,
};
