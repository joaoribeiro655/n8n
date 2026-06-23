"use strict";

/**
 * Extrai e-mail, WhatsApp e Instagram do site da empresa.
 * Usa fetch puro (sem navegador) + regex. Best-effort: tenta a home e algumas
 * páginas de contato comuns. Funciona na maioria dos sites institucionais.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const CONTACT_PATHS = ["", "contato", "contato.html", "fale-conosco", "fale-conosco.html", "contact"];

// E-mails que quase sempre são lixo (libs, exemplos, imagens).
const EMAIL_BLOCKLIST = /(sentry|wixpress|example\.com|@2x|\.png|\.jpg|\.gif|\.webp|\.svg|domain\.com|email\.com|seuemail)/i;

function normalizeBaseUrl(url) {
  if (!url) return null;
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    return parsed.origin;
  } catch {
    return null;
  }
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

function extractEmails(html) {
  const found = new Set();
  const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let m;
  while ((m = re.exec(html))) {
    const email = m[0].toLowerCase();
    if (!EMAIL_BLOCKLIST.test(email)) found.add(email);
  }
  return [...found];
}

function extractWhatsapp(html) {
  // Links wa.me / api.whatsapp.com / "whatsapp" perto de um número.
  const re = /(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d{10,15})/i;
  const m = html.match(re);
  if (m) return m[1];
  return "";
}

function extractInstagram(html) {
  const m = html.match(/instagram\.com\/([A-Za-z0-9_.]{2,40})/i);
  if (m && !["p", "explore", "accounts", "reel"].includes(m[1])) {
    return "https://instagram.com/" + m[1];
  }
  return "";
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
    if (!whatsapp) whatsapp = extractWhatsapp(html);
    if (!instagram) instagram = extractInstagram(html);

    if (email && whatsapp) break; // já temos o essencial
  }

  return { email, whatsapp, instagram };
}

module.exports = { extractFromWebsite, extractEmails, extractWhatsapp, extractInstagram, normalizeBaseUrl };
