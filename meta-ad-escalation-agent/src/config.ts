/**
 * Carrega configuração de variáveis de ambiente. Faz um parse simples de um
 * arquivo .env local (sem dependência externa) para facilitar o uso via CLI.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env é opcional
  }
}

loadDotEnv();

export const config = {
  meta: {
    accessToken: process.env.META_ACCESS_TOKEN ?? '',
    graphVersion: process.env.META_GRAPH_VERSION ?? 'v21.0',
  },
  apify: {
    token: process.env.APIFY_TOKEN ?? '',
    // Actor da Ad Library. Default: curious_coder/facebook-ads-library-scraper.
    actorId: process.env.APIFY_ACTOR_ID ?? 'curious_coder~facebook-ads-library-scraper',
  },
  scraper: {
    // Caminho do Chromium. Vazio = deixa o Playwright achar o dele (normal
    // após `npx playwright install`). Só precisa setar em ambientes que já
    // têm um Chromium pré-instalado em local não-padrão.
    chromiumPath: process.env.CHROMIUM_PATH ?? '',
    // headless=false abre a janela (útil pra depurar / passar checagens).
    headless: (process.env.SCRAPER_HEADLESS ?? 'true') !== 'false',
    // Proxy opcional (ex.: ambientes corporativos). Vazio = sem proxy.
    proxy: process.env.HTTPS_PROXY ?? process.env.SCRAPER_PROXY ?? '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8',
  },
};
