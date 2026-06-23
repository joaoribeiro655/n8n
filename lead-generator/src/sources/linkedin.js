"use strict";

/**
 * LinkedIn — busca ASSISTIDA (não automática).
 *
 * Scraping direto do LinkedIn exige login e bloqueia robôs agressivamente, então
 * em vez de coletar (e quebrar toda hora) o app gera links de busca já prontos:
 * você clica e o LinkedIn/Google abre a lista de decisores daquela empresa.
 */

const DEFAULT_TITLES = ["dono", "proprietário", "diretor", "gerente comercial", "gerente"];

function buildLinkedinSearch(company, titles = DEFAULT_TITLES) {
  if (!company) return "";
  // Busca no Google restrita a perfis do LinkedIn (mais eficaz que a busca interna sem login).
  const titleExpr = titles.map((t) => `"${t}"`).join(" OR ");
  const q = `site:linkedin.com/in "${company}" (${titleExpr})`;
  return "https://www.google.com/search?q=" + encodeURIComponent(q);
}

/** Anexa o link de busca de decisores a cada lead que tenha empresa. */
function attachLinkedinSearches(leads, titles) {
  for (const lead of leads) {
    if (lead.company && !lead.linkedinSearch) {
      lead.linkedinSearch = buildLinkedinSearch(lead.company, titles);
    }
  }
  return leads;
}

module.exports = { buildLinkedinSearch, attachLinkedinSearches };
