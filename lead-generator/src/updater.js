"use strict";

// Auto-update grátis (sem assinatura Apple): ao abrir, o app consulta o
// GitHub Releases do repositório e, se houver versão mais nova, avisa e
// abre o download. Não instala sozinho (isso exigiria app assinado/notarizado),
// mas resolve para uso próprio ou de poucas pessoas, custo zero.

const { app, dialog, shell } = require("electron");
const https = require("node:https");

// Onde as versões novas são publicadas (GitHub Releases).
// Troque aqui se um dia mudar o repositório de distribuição.
const REPO_OWNER = "joaoribeiro655";
const REPO_NAME = "n8n";

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.github.com",
        path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
        method: "GET",
        headers: {
          "User-Agent": "gerador-de-leads-updater",
          Accept: "application/vnd.github+json",
        },
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          // 404 = ainda não há nenhuma release publicada. Não é erro.
          if (res.statusCode === 404) return resolve(null);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error("GitHub respondeu HTTP " + res.statusCode));
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("tempo esgotado")));
    req.end();
  });
}

/** Compara "1.2.0" com "1.10.3" numericamente (ignora sufixo -beta etc.). */
function parseVer(v) {
  return String(v || "")
    .replace(/^v/i, "")
    .split("-")[0]
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
}
function isNewer(remote, local) {
  const a = parseVer(remote);
  const b = parseVer(local);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

/**
 * Verifica se há atualização.
 * @param {object} opts
 * @param {boolean} opts.silent  Se true, não mostra nada quando está atualizado
 *                               nem quando a checagem falha (uso no arranque).
 * @param {BrowserWindow} [opts.parentWindow]
 */
async function checkForUpdates({ silent = true, parentWindow } = {}) {
  const current = app.getVersion();
  try {
    const rel = await fetchLatestRelease();

    if (!rel || !rel.tag_name || !isNewer(rel.tag_name, current)) {
      if (!silent) {
        await dialog.showMessageBox(parentWindow, {
          type: "info",
          title: "Atualizações",
          message: "Você já está na versão mais recente.",
          detail: `Versão atual: ${current}`,
          buttons: ["OK"],
        });
      }
      return { updateAvailable: false, current };
    }

    // Preferir o instalador .dmg; cair para .zip; senão, a página da release.
    const assets = rel.assets || [];
    const dmg = assets.find((a) => /\.dmg$/i.test(a.name));
    const zip = assets.find((a) => /\.zip$/i.test(a.name));
    const downloadUrl = (dmg || zip)?.browser_download_url || rel.html_url;

    const { response } = await dialog.showMessageBox(parentWindow, {
      type: "info",
      title: "Atualização disponível",
      message: `Nova versão ${rel.tag_name} disponível`,
      detail: `Você está usando a ${current}. Quer baixar a versão nova agora?`,
      buttons: ["Baixar agora", "Depois"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) await shell.openExternal(downloadUrl);
    return { updateAvailable: true, current, latest: rel.tag_name };
  } catch (err) {
    if (!silent) {
      await dialog.showMessageBox(parentWindow, {
        type: "warning",
        title: "Atualizações",
        message: "Não foi possível verificar atualizações.",
        detail: err?.message || String(err),
        buttons: ["OK"],
      });
    }
    return { updateAvailable: false, current, error: err?.message || String(err) };
  }
}

module.exports = { checkForUpdates };
