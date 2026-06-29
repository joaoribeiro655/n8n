"use strict";

/**
 * Extrai e-mail, WhatsApp e Instagram do site da empresa (fetch + regex).
 * Cobre casos comuns que normalmente se perdem:
 *  - e-mails ofuscados pelo Cloudflare (data-cfemail);
 *  - links mailto: e wa.me / api.whatsapp.com;
 *  - várias páginas de contato.
 * Também normaliza telefone BR em link wa.me.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const CONTACT_PATHS = [
  "",
  "contato",
  "contato.html",
  "fale-conosco",
  "fale-conosco.html",
  "contact",
  "sobre",
  "institucional",
  "quem-somos",
];

// E-mails que quase sempre são lixo (libs, exemplos, imagens).
const EMAIL_BLOCKLIST =
  /(sentry|wixpress|example\.com|@2x|\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|domain\.com|email\.com|seuemail|@sentry)/i;

function normalizeBaseUrl(url) {
  if (!url) return null;
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
}

/** Converte um telefone (BR) em link wa.me. Aceita com/sem DDI. */
function phoneToWhatsapp(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  // Sem DDI (10 ou 11 dígitos = DDD + número): prefixa 55.
  if (d.length === 10 || d.length === 11) d = "55" + d;
  // Com DDI deve ter 12 (fixo) ou 13 (celular) dígitos.
  if (d.length < 12 || d.length > 13) return "";
  return "https://wa.me/" + d;
}

/** Decodifica e-mails ofuscados pelo Cloudflare (atributo data-cfemail). */
function decodeCfEmails(html) {
  const out = [];
  const re = /data-cfemail="([0-9a-fA-F]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const hex = m[1];
    const key = parseInt(hex.substr(0, 2), 16);
    let email = "";
    for (let i = 2; i < hex.length; i += 2) {
      email += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ key);
    }
    if (email.includes("@")) out.push(email.toLowerCase());
  }
  return out;
}

function extractEmails(html) {
  const found = new Set();
  // 1) Cloudflare
  for (const e of decodeCfEmails(html)) if (!EMAIL_BLOCKLIST.test(e)) found.add(e);
  // 2) mailto:
  const reMailto = /mailto:([^"'>\s?]+@[^"'>\s?]+)/gi;
  let m;
  while ((m = reMailto.exec(html))) {
    const e = m[1].toLowerCase();
    if (!EMAIL_BLOCKLIST.test(e)) found.add(e);
  }
  // 3) texto solto
  const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  while ((m = re.exec(html))) {
    const e = m[0].toLowerCase();
    if (!EMAIL_BLOCKLIST.test(e)) found.add(e);
  }
  // Prioriza e-mails "de contato" comuns.
  const list = [...found];
  list.sort((a, b) => score(b) - score(a));
  return list;
}

function score(email) {
  return /^(contato|vendas|comercial|atendimento|sac|faleconosco)@/.test(email) ? 1 : 0;
}

function extractWhatsapp(html) {
  const m = html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d{10,15})/i);
  return m ? m[1] : "";
}

function extractInstagram(html) {
  const m = html.match(/instagram\.com\/([A-Za-z0-9_.]{2,40})/i);
  if (m && !["p", "explore", "accounts", "reel", "reels", "stories"].includes(m[1])) {
    return "https://instagram.com/" + m[1];
  }
  return "";
}

async function fetchText(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text") && !ct.includes("html")) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

/** Retorna { email, whatsapp, instagram } a partir do site informado. */
async function extractFromWebsite(website) {
  const base = normalizeBaseUrl(website);
  if (!base) return { email: "", whatsapp: "", instagram: "" };

  let email = "";
  let whatsapp = "";
  let instagram = "";

  for (const p of CONTACT_PATHS) {
    const url = p ? `${base}/${p}` : base;
    const html = await fetchText(url);
    if (!html) continue;

    if (!email) {
      const emails = extractEmails(html);
      if (emails.length) email = emails[0];
    }
    if (!whatsapp) {
      const wa = extractWhatsapp(html);
      if (wa) whatsapp = phoneToWhatsapp(wa) || "https://wa.me/" + wa.replace(/\D/g, "");
    }
    if (!instagram) instagram = extractInstagram(html);

    if (email && whatsapp) break; // já temos o essencial
  }

  return { email, whatsapp, instagram };
}

module.exports = {
  extractFromWebsite,
  extractEmails,
  extractWhatsapp,
  extractInstagram,
  decodeCfEmails,
  phoneToWhatsapp,
  normalizeBaseUrl,
};
