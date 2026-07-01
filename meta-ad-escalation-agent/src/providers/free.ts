/**
 * Provider GRATUITO da Meta Ad Library via Playwright.
 *
 * Abre a Biblioteca de Anúncios pública num navegador headless, intercepta as
 * respostas internas do GraphQL (`/api/graphql/`) e extrai os anúncios delas.
 * Não usa API paga nem token — só um Chromium.
 *
 * Requisitos:
 * - `npm install playwright && npx playwright install chromium` (uma vez), ou
 *   um Chromium já instalado apontado por CHROMIUM_PATH.
 * - Acesso de rede ao facebook.com (rode na sua máquina, não em sandboxes
 *   com egress bloqueado).
 *
 * Observação: a Ad Library é uma ferramenta pública de transparência. Ainda
 * assim, scraping está sujeito aos Termos da Meta e a mudanças no site — a
 * extração é feita de forma resiliente (varredura recursiva do JSON).
 */
import { existsSync, readdirSync } from 'node:fs';
import { config } from '../config.js';
import type { Ad, AdLibraryProvider, SearchQuery } from '../types.js';
import { buildAdLibraryUrl, collectAdNodes, normalizeRawAd } from './raw.js';

/** Facebook às vezes prefixa respostas com `for (;;);` e concatena JSONs. */
export function parseFbPayload(text: string): unknown[] {
  const cleaned = text.replace(/^for\s*\(;;\);/, '').trim();
  if (!cleaned) return [];
  try {
    return [JSON.parse(cleaned)];
  } catch {
    // respostas em streaming: um objeto JSON por linha
    const out: unknown[] = [];
    for (const line of cleaned.split('\n')) {
      const l = line.trim();
      if (!l.startsWith('{')) continue;
      try {
        out.push(JSON.parse(l));
      } catch {
        /* ignora fragmentos */
      }
    }
    return out;
  }
}

/** Tenta descobrir um Chromium pré-instalado (ex.: /opt/pw-browsers). */
function detectChromium(): string | undefined {
  if (config.scraper.chromiumPath) return config.scraper.chromiumPath;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (base && existsSync(base)) {
    try {
      const dir = readdirSync(base).find((d) => d.startsWith('chromium-'));
      if (dir) {
        const exec = `${base}/${dir}/chrome-linux/chrome`;
        if (existsSync(exec)) return exec;
      }
    } catch {
      /* ignora */
    }
  }
  return undefined; // deixa o Playwright usar o browser dele
}

export class FreeScraperProvider implements AdLibraryProvider {
  readonly name = 'free';

  async search(query: SearchQuery): Promise<Ad[]> {
    const country = query.countries[0] ?? 'BR';
    const term = query.terms ?? '';
    const limit = query.limit ?? 100;

    // Import dinâmico: quem usa outro provider não precisa ter o playwright.
    let chromium;
    try {
      ({ chromium } = await import('playwright'));
    } catch {
      throw new Error(
        'Playwright não instalado. Rode: npm install playwright && npx playwright install chromium',
      );
    }

    const executablePath = detectChromium();
    const proxy = config.scraper.proxy ? { server: config.scraper.proxy } : undefined;

    const browser = await chromium.launch({
      headless: config.scraper.headless,
      executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      proxy,
    });

    const nodes = new Map<string, Record<string, unknown>>();
    try {
      const ctx = await browser.newContext({
        locale: 'pt-BR',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/122.0 Safari/537.36',
      });
      const page = await ctx.newPage();

      page.on('response', async (res) => {
        if (!res.url().includes('/api/graphql/')) return;
        try {
          const text = await res.text();
          for (const payload of parseFbPayload(text)) collectAdNodes(payload, nodes);
        } catch {
          /* resposta não-textual ou já descartada */
        }
      });

      await page.goto(buildAdLibraryUrl(term, country), {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await this.dismissConsent(page);

      // Rola a página para disparar carregamento incremental até bater o limite
      // ou parar de crescer (3 rodadas sem novos anúncios).
      let stable = 0;
      for (let i = 0; i < 40 && nodes.size < limit && stable < 3; i++) {
        const before = nodes.size;
        await page.mouse.wheel(0, 25000);
        await page.waitForTimeout(2500);
        if (nodes.size === before) stable++;
        else stable = 0;
      }
    } finally {
      await browser.close();
    }

    return [...nodes.values()].map((n) => normalizeRawAd(n, country)).slice(0, limit);
  }

  /** Fecha banners de cookies/consentimento (best-effort, não falha se ausente). */
  private async dismissConsent(page: import('playwright').Page): Promise<void> {
    const labels = ['Permitir todos', 'Aceitar tudo', 'Allow all', 'Accept all', 'Only allow essential cookies'];
    for (const label of labels) {
      try {
        const btn = page.getByRole('button', { name: label });
        if (await btn.first().isVisible({ timeout: 1500 })) {
          await btn.first().click({ timeout: 2000 });
          await page.waitForTimeout(1000);
          return;
        }
      } catch {
        /* segue */
      }
    }
  }
}
