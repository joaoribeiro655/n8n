/**
 * Provider da Meta Ad Library via Apify — cobre anúncios COMERCIAIS do Brasil,
 * que a API oficial não expõe.
 *
 * Usa o endpoint run-sync-get-dataset-items do Apify: dispara o actor da
 * Ad Library, aguarda terminar e devolve os itens do dataset.
 *
 * Actor default: curious_coder/facebook-ads-library-scraper.
 * Troque via APIFY_ACTOR_ID se usar outro. A normalização abaixo é defensiva
 * porque cada actor devolve um formato ligeiramente diferente.
 *
 * Docs Apify: https://docs.apify.com/api/v2#/reference/actors/run-actor-synchronously-with-input-and-get-dataset-items
 */
import { config } from '../config.js';
import type { Ad, AdLibraryProvider, SearchQuery } from '../types.js';

/** Monta a URL de busca da Biblioteca de Anúncios para um termo/país. */
export function buildAdLibraryUrl(term: string, country: string): string {
  const params = new URLSearchParams({
    active_status: 'active',
    ad_type: 'all',
    country,
    q: term,
    search_type: 'keyword_unordered',
    media_type: 'all',
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

/** Aceita ISO string, unix (segundos) ou unix (ms) e devolve ISO 8601 ou null. */
function toIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    // já é data legível?
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    // string numérica?
    const n = Number(value);
    if (!Number.isNaN(n)) return toIso(n);
    return null;
  }
  if (typeof value === 'number') {
    // segundos vs milissegundos
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  return [value as T];
}

function firstDefined<T>(...values: T[]): T | undefined {
  return values.find((v) => v !== undefined && v !== null && v !== '');
}

/** Extrai os textos do criativo de formatos variados de `snapshot`. */
function extractCreative(item: Record<string, unknown>): {
  bodies: string[];
  titles: string[];
  descriptions: string[];
} {
  const snapshot = (item.snapshot ?? {}) as Record<string, unknown>;
  const bodies: string[] = [];
  const titles: string[] = [];
  const descriptions: string[] = [];

  const pushBody = (v: unknown) => {
    if (typeof v === 'string' && v.trim()) bodies.push(v.trim());
    else if (v && typeof v === 'object' && 'text' in (v as object)) {
      const t = (v as { text?: unknown }).text;
      if (typeof t === 'string' && t.trim()) bodies.push(t.trim());
    }
  };

  pushBody(snapshot.body);
  pushBody((item as { ad_creative_bodies?: unknown }).ad_creative_bodies);
  for (const b of asArray<unknown>((item as { ad_creative_bodies?: unknown }).ad_creative_bodies)) {
    pushBody(b);
  }

  const title = firstDefined(snapshot.title, (item as { title?: string }).title);
  if (typeof title === 'string' && title.trim()) titles.push(title.trim());

  const desc = firstDefined(
    snapshot.link_description,
    (item as { link_description?: string }).link_description,
  );
  if (typeof desc === 'string' && desc.trim()) descriptions.push(desc.trim());

  // Cards (carrossel): cada card pode ter body/title próprios.
  for (const card of asArray<Record<string, unknown>>(snapshot.cards)) {
    pushBody(card.body);
    if (typeof card.title === 'string' && card.title.trim()) titles.push(card.title.trim());
    if (typeof card.link_description === 'string' && card.link_description.trim()) {
      descriptions.push(card.link_description.trim());
    }
  }

  return { bodies, titles, descriptions };
}

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
    return items.map((item) => this.normalize(item, country)).slice(0, count);
  }

  private normalize(item: Record<string, unknown>, fallbackCountry: string): Ad {
    const snapshot = (item.snapshot ?? {}) as Record<string, unknown>;
    const creative = extractCreative(item);

    const id = String(
      firstDefined(
        item.adArchiveID,
        item.ad_archive_id,
        (item as { adid?: unknown }).adid,
        item.id,
      ) ?? '',
    );

    const pageId = String(
      firstDefined(item.pageID, item.page_id, snapshot.page_id) ?? '',
    );
    const pageName = String(
      firstDefined(item.pageName, item.page_name, snapshot.page_name) ?? '(desconhecido)',
    );

    const platforms = asArray<string>(
      firstDefined(item.publisherPlatform, item.publisher_platform, item.publisher_platforms),
    ).map((p) => String(p).toLowerCase());

    const collationRaw = firstDefined(item.collationCount, item.collation_count);
    const collationCount =
      typeof collationRaw === 'number'
        ? collationRaw
        : collationRaw != null && !Number.isNaN(Number(collationRaw))
          ? Number(collationRaw)
          : null;

    return {
      id,
      pageId,
      pageName,
      deliveryStart:
        toIso(firstDefined(item.startDate, item.start_date, item.ad_delivery_start_time)) ??
        new Date().toISOString(),
      deliveryStop: toIso(firstDefined(item.endDate, item.end_date, item.ad_delivery_stop_time)),
      platforms,
      creativeBodies: creative.bodies,
      creativeTitles: creative.titles,
      creativeDescriptions: creative.descriptions,
      snapshotUrl:
        (firstDefined(item.url, item.snapshotUrl, snapshot.snapshot_url) as string | undefined) ??
        (id ? `https://www.facebook.com/ads/library/?id=${id}` : null),
      countries: asArray<string>(
        firstDefined(item.reachedCountries, item.reached_countries, item.ad_reached_countries),
      ).map(String) || [fallbackCountry],
      collationCount,
    };
  }
}
