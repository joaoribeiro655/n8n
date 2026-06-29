"use strict";

/**
 * Busca na web usando o próprio Chromium do Electron (janela invisível).
 * Renderiza a página como um navegador real — por isso não é bloqueado como
 * acontece com fetch cru. Usado para achar perfis do LinkedIn.
 *
 * Usa o DuckDuckGo (não pede captcha) e devolve o HTML já renderizado, de onde
 * o linkedin.js extrai os perfis.
 */

const { BrowserWindow } = require("electron");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createSearcher() {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: { images: false, javascript: true },
  });

  async function search(query) {
    const url = "https://duckduckgo.com/?kl=br-pt&ia=web&q=" + encodeURIComponent(query);
    try {
      await win.loadURL(url);
      // Espera os resultados renderizarem (ou aparecer algum link do LinkedIn).
      for (let i = 0; i < 16; i++) {
        await sleep(500);
        const ready = await win.webContents
          .executeJavaScript(
            `!!document.querySelector('a[data-testid="result-title-a"]') || /linkedin\\.com\\/in\\//.test(document.body.innerText)`,
          )
          .catch(() => false);
        if (ready) break;
      }
      const html = await win.webContents
        .executeJavaScript("document.documentElement.outerHTML")
        .catch(() => "");
      return html || "";
    } catch {
      return "";
    }
  }

  function close() {
    try {
      win.destroy();
    } catch {
      /* ok */
    }
  }

  return { search, close };
}

module.exports = { createSearcher };
