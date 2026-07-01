/**
 * Provider da Meta Ad Library via Apify (PAGO) — cobre anúncios comerciais do
 * Brasil, que a API oficial não expõe. Se você quer de graça, use o provider
 * "free" (Playwright).
 *
 * Usa o endpoint run-sync-get-dataset-items do Apify: dispara o actor da
 * Ad Library, aguarda terminar e devolve os itens do dataset.
 * Actor default: curious_coder/facebook-ads-library-scraper.
 */
import { config } from '../config.js';
import type { Ad, AdLibraryProvider, SearchQuery } from '../types.js';
import { buildAdLibraryUrl, normalizeRawAd } from './raw.js';

export class ApifyProvider implements AdLibraryProvider {
  readonly name = 'apify';

  constructor(
    private readonly token: string = config.apify.token,
    private readonly actorId: string = config.apify.actorId,
  ) {
    if (!this.token) {
      throw new Error('APIFY_TOKEN não configurado. Defina no .env para usar o provider "apify".');
    }
  }

  async search(query: SearchQuery): Promise<Ad[]> {
    const country = query.countries[0] ?? 'BR';
    const term = query.terms ?? '';
    const count = query.limit ?? 200;

    const input: Record<string, unknown> = {
      urls: [{ url: buildAdLibraryUrl(term, country), method: 'GET' }],
      count,
      scrapeAdDetails: true,
      'scrapePageAds.activeStatus': (query.activeStatus ?? 'active').toLowerCase(),
    };

    const endpoint =
      `https://api.apify.com/v2/acts/${this.actorId}/run-sync-get-dataset-items` +
      `?token=${encodeURIComponent(this.token)}&timeout=300&format=json`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Apify erro HTTP ${res.status}: ${text.slice(0, 300)}`);
    }

    const items = (await res.json()) as Record<string, unknown>[];
    return items.map((item) => normalizeRawAd(item, country)).slice(0, count);
  }
}
