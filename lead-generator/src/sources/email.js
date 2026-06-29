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

module.exports = { guessEmails, hasMx, bestGuessEmail, domainFromUrl, nameParts };
