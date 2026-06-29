"use strict";

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const { scrapeGoogleMaps } = require("./sources/googleMaps");
const { extractFromWebsite, phoneToWhatsapp } = require("./sources/website");
const { listByCnae, enrichByCnpj } = require("./sources/cnpj");
const { enrichLinkedin } = require("./sources/linkedin");
const { createSearcher } = require("./sources/websearch");
const { bestGuessEmail, domainFromUrl } = require("./sources/email");
const { buildCsv } = require("./csv");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#070b14",
    title: "Gerador de Leads",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.removeMenu?.();
  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/** Deduplica por site (domínio), depois por empresa+telefone. */
function dedupe(leads) {
  const seen = new Set();
  const out = [];
  for (const l of leads) {
    let key = "";
    if (l.website) {
      try {
        key = "site:" + new URL(/^https?:/.test(l.website) ? l.website : "https://" + l.website).hostname;
      } catch {
        key = "";
      }
    }
    if (!key) key = "co:" + (l.company || "").toLowerCase().trim() + "|" + (l.phone || "").replace(/\D/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(l);
  }
  return out;
}

ipcMain.handle("run", async (event, params) => {
  const progress = (msg) => event.sender.send("progress", msg);
  const {
    cities = [],
    businessType = "concessionária",
    limit = 30,
    sources = {},
    cnae = ["4511101", "4511102"],
    uf = "",
    titles = [],
  } = params || {};

  let leads = [];

  try {
    // 1) Google Maps (fonte principal)
    if (sources.maps) {
      const targets = cities.length ? cities : [""];
      for (const city of targets) {
        const query = city ? `${businessType} em ${city}` : businessType;
        const found = await scrapeGoogleMaps({ query, limit, onProgress: progress });
        for (const f of found) f.city = f.city || city;
        leads.push(...found);
      }
    }

    // 2) Base de CNPJ (Casa dos Dados) — lista por CNAE + município
    if (sources.cnpj) {
      const targets = cities.length ? cities : [""];
      for (const city of targets) {
        progress(`Buscando CNPJs (${city || "geral"})…`);
        const found = await listByCnae({ cnaes: cnae, uf, city, limit });
        leads.push(...found);
      }
    }

    leads = dedupe(leads);
    progress(`${leads.length} empresas após deduplicar.`);

    // 3) Enriquecimento de e-mail/WhatsApp pelo site
    if (sources.site) {
      const comSite = leads.filter((l) => l.website && !l.email);
      let done = 0;
      for (const lead of comSite) {
        const info = await extractFromWebsite(lead.website);
        if (info.email) lead.email = info.email;
        if (info.whatsapp) lead.whatsapp = info.whatsapp;
        if (info.instagram) lead.instagram = info.instagram;
        progress(`E-mails: ${++done}/${comSite.length}…`);
      }
    }

    // 4) Enriquecimento por CNPJ (BrasilAPI) para quem já tem CNPJ
    if (sources.cnpj) {
      const comCnpj = leads.filter((l) => l.cnpj && !l.email);
      let done = 0;
      for (const lead of comCnpj) {
        const info = await enrichByCnpj(lead.cnpj);
        if (info) {
          lead.email = lead.email || info.email;
          lead.phone = lead.phone || info.phone;
          lead.address = lead.address || info.address;
        }
        progress(`CNPJ: ${++done}/${comCnpj.length}…`);
      }
    }

    // 5) LinkedIn — coleta híbrida (acha o perfil do decisor via busca web, sem login)
    if (sources.linkedin) {
      const searcher = await createSearcher();
      try {
        await enrichLinkedin(leads, {
          titles: titles.length ? titles : undefined,
          searchHtml: searcher.search,
          onProgress: progress,
        });
      } finally {
        searcher.close();
      }
    }

    // 6) E-mail provável do decisor (nome do decisor + domínio da empresa)
    if (sources.site) {
      const alvo = leads.filter((l) => l.name && l.website && !l.email);
      let done = 0;
      for (const lead of alvo) {
        const guess = await bestGuessEmail(lead.name, domainFromUrl(lead.website));
        if (guess) lead.emailGuess = guess;
        progress(`E-mail provável: ${++done}/${alvo.length}…`);
      }
    }

    // 7) WhatsApp a partir do telefone coletado (sempre, é grátis e instantâneo)
    for (const lead of leads) {
      if (!lead.whatsapp && lead.phone) {
        const wa = phoneToWhatsapp(lead.phone);
        if (wa) lead.whatsapp = wa;
      }
    }

    progress(`Concluído: ${leads.length} leads.`);
    return { ok: true, leads };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle("export-csv", async (_event, leads) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Salvar lista de leads",
    defaultPath: `leads-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, buildCsv(leads), "utf8");
  return { ok: true, filePath };
});

ipcMain.handle("open-external", async (_event, url) => {
  if (url) await shell.openExternal(url);
  return { ok: true };
});
