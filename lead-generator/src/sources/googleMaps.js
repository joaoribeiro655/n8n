"use strict";

/**
 * Google Maps — raspagem usando o próprio Chromium do Electron (sem chave, grátis).
 *
 * Estratégia:
 *  1. Abre uma janela invisível e carrega a busca (ex.: "concessionária em Curitiba").
 *  2. Rola o painel de resultados para carregar mais lugares e coleta os links.
 *  3. Abre cada lugar e extrai nome, telefone, site, endereço, categoria e nota.
 *
 * ⚠️ O HTML do Google Maps muda de tempos em tempos. Os seletores abaixo estão
 * isolados em CONSTS para facilitar manutenção quando algo parar de funcionar.
 */

const { BrowserWindow } = require("electron");

const SEL = {
  feed: 'div[role="feed"]',
  placeLink: "a.hfpxzc, a[href*='/maps/place/']",
  name: "h1.DUwDvf, h1",
  phone: 'button[data-item-id^="phone:tel:"]',
  website: 'a[data-item-id="authority"]',
  address: 'button[data-item-id="address"]',
  category: 'button[jsaction*="category"]',
  rating: "div.F7nice span[aria-hidden='true']",
  reviews: "div.F7nice span[aria-label*='avalia'], div.F7nice span[aria-label*='review']",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function searchUrl(query) {
  return "https://www.google.com/maps/search/" + encodeURIComponent(query) + "?hl=pt-BR";
}

async function waitForSelector(wc, selector, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ok = await wc
      .executeJavaScript(`!!document.querySelector(${JSON.stringify(selector)})`)
      .catch(() => false);
    if (ok) return true;
    await sleep(500);
  }
  return false;
}

/**
 * Raspa lugares do Google Maps para uma busca.
 * @param {{query:string, limit:number, onProgress?:Function}} opts
 * @returns {Promise<Array>}
 */
async function scrapeGoogleMaps({ query, limit = 30, onProgress }) {
  const log = (msg) => onProgress && onProgress(msg);

  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: { offscreen: false, javascript: true, images: false },
  });

  try {
    log(`Abrindo Google Maps: "${query}"…`);
    await win.loadURL(searchUrl(query));
    const ok = await waitForSelector(win.webContents, SEL.feed, 25000);
    if (!ok) {
      log("Não consegui carregar a lista (Google pode ter pedido captcha).");
      return [];
    }

    // Rola o painel para carregar mais resultados.
    log("Carregando resultados (rolando a lista)…");
    await win.webContents.executeJavaScript(`(async () => {
      const feed = document.querySelector(${JSON.stringify(SEL.feed)});
      if (!feed) return;
      let lastH = 0;
      for (let i = 0; i < 25; i++) {
        feed.scrollTop = feed.scrollHeight;
        await new Promise(r => setTimeout(r, 1300));
        if (feed.scrollHeight === lastH) break;
        lastH = feed.scrollHeight;
      }
    })()`);

    // Coleta os links únicos dos lugares.
    let links = await win.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll(${JSON.stringify(SEL.placeLink)}))
        .map(a => a.href).filter(h => h && h.includes('/maps/place/'))`,
    );
    links = [...new Set(links)].slice(0, limit);
    log(`${links.length} lugares encontrados. Coletando detalhes…`);

    const leads = [];
    for (let i = 0; i < links.length; i++) {
      try {
        await win.loadURL(links[i]);
        await waitForSelector(win.webContents, SEL.name, 15000);
        await sleep(600);
        const data = await win.webContents.executeJavaScript(`(() => {
          const q = (s) => document.querySelector(s);
          const txt = (el) => (el ? el.textContent.trim() : "");
          const sel = ${JSON.stringify(SEL)};
          const phoneBtn = q(sel.phone);
          const phone = phoneBtn
            ? (phoneBtn.getAttribute("data-item-id") || "").replace("phone:tel:", "")
            : "";
          const siteEl = q(sel.website);
          const addrEl = q(sel.address);
          const addr = addrEl
            ? (addrEl.getAttribute("aria-label") || addrEl.textContent || "").replace(/^Endereço:?\\s*/i, "").trim()
            : "";
          const reviewsEl = q(sel.reviews);
          return {
            name: txt(q(sel.name)),
            phone,
            website: siteEl ? siteEl.href : "",
            address: addr,
            category: txt(q(sel.category)),
            rating: txt(q(sel.rating)),
            reviews: reviewsEl ? (reviewsEl.getAttribute("aria-label") || reviewsEl.textContent || "").replace(/\\D/g, "") : "",
          };
        })()`);

        if (data && data.name) {
          leads.push({
            company: data.name,
            name: "",
            category: data.category || "",
            phone: (data.phone || "").trim(),
            whatsapp: "",
            email: "",
            website: data.website || "",
            instagram: "",
            address: data.address || "",
            city: "",
            rating: data.rating || "",
            reviews: data.reviews || "",
            cnpj: "",
            source: "google_maps",
            mapsUrl: links[i],
            linkedinSearch: "",
          });
        }
        log(`Coletados ${leads.length}/${links.length}…`);
      } catch {
        /* pula lugar que falhar */
      }
    }

    return leads;
  } finally {
    win.destroy();
  }
}

module.exports = { scrapeGoogleMaps };
