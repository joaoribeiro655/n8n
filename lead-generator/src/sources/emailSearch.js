"use strict";

/**
 * Fonte extra de e-mail: busca web (DuckDuckGo via o Chromium do app) para
 * leads que ficaram SEM e-mail. Trava anti-falso-positivo:
 *  - se a empresa tem site conhecido, só aceita e-mail DAQUELE domínio;
 *  - se não tem site, só aceita e-mail "de papel" (contato@, vendas@…) e
 *    aproveita para descobrir o domínio/site da empresa.
 * Assim evitamos colar no lead um e-mail aleatório que apareceu na busca.
 */

const { extractEmails } = require("./website");
const { domainFromUrl } = require("./email");

const ROLE = /^(contato|vendas|comercial|atendimento|sac|faleconosco|financeiro)@/;
// Provedores gratuitos: aceitamos só se forem "de papel" e sem site conhecido.
const FREE = /@(gmail|hotmail|outlook|yahoo|live|bol|uol|terra|icloud)\./i;

/**
 * @param {object} lead
 * @param {(query:string)=>Promise<string>} searchHtml  buscador (retorna HTML)
 * @returns {Promise<{email:string, website?:string}|null>}
 */
async function findEmailBySearch(lead, searchHtml) {
  const nome = (lead.company || "").trim();
  if (!nome) return null;

  const domain = lead.website ? domainFromUrl(lead.website) : "";
  const cidade = lead.city ? ` ${lead.city}` : "";
  const query = `"${nome}"${cidade} e-mail contato`;

  const html = await searchHtml(query);
  if (!html) return null;

  const emails = extractEmails(html);
  if (!emails.length) return null;

  // Caso 1: sabemos o domínio da empresa → só aceita e-mail desse domínio.
  if (domain) {
    const match = emails.find((e) => e.endsWith("@" + domain));
    return match ? { email: match } : null;
  }

  // Caso 2: sem site → só aceita e-mail "de papel"; descobre o site pelo domínio.
  const role = emails.find((e) => ROLE.test(e) && !FREE.test(e));
  if (role) {
    const dom = role.split("@")[1];
    return { email: role, website: "https://" + dom };
  }

  // Sem site e só e-mail genérico/pessoal → arriscado demais, descarta.
  return null;
}

module.exports = { findEmailBySearch };
