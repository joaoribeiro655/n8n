/**
 * Provider da Meta Ad Library via Graph API oficial (endpoint `ads_archive`).
 *
 * LIMITAÇÕES IMPORTANTES:
 * - `ad_type=POLITICAL_AND_ISSUE_ADS` retorna dados ricos (spend, impressions)
 *   mas só cobre anúncios políticos/sociais.
 * - `ad_type=ALL` retorna anúncios comerciais apenas para países da UE (por
 *   força do DSA) e com campos limitados. Para BR/US comerciais, a API oficial
 *   não expõe o catálogo geral — use um scraper (ver ScraperProvider).
 *
 * Docs: https://www.facebook.com/ads/library/api/
 */
import { config } from '../config.js';
import type { Ad, AdLibraryProvider, SearchQuery } from '../types.js';

interface GraphAdRecord {
  id: string;
  page_id?: string;
  page_name?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  publisher_platforms?: string[];
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_descriptions?: string[];
  ad_snapshot_url?: string;
  ad_reached_countries?: string[];
  eu_total_reach?: number;
}

interface GraphResponse {
  data: GraphAdRecord[];
  paging?: { next?: string };
  error?: { message: string; type: string; code: number };
}

const FIELDS = [
  'id',
  'page_id',
  'page_name',
  'ad_delivery_start_time',
  'ad_delivery_stop_time',
  'publisher_platforms',
  'ad_creative_bodies',
  'ad_creative_link_titles',
  'ad_creative_link_descriptions',
  'ad_snapshot_url',
  'ad_reached_countries',
].join(',');

export class GraphApiProvider implements AdLibraryProvider {
  readonly name = 'graph';

  constructor(private readonly accessToken: string = config.meta.accessToken) {
    if (!this.accessToken) {
      throw new Error(
        'META_ACCESS_TOKEN não configurado. Defina no .env ou use o provider "mock".',
      );
    }
  }

  async search(query: SearchQuery): Promise<Ad[]> {
    const limit = query.limit ?? 200;
    const pageSize = Math.min(limit, 100); // Graph API teto por página

    const params = new URLSearchParams({
      access_token: this.accessToken,
      ad_type: query.adType ?? 'ALL',
      ad_active_status: query.activeStatus ?? 'ACTIVE',
      ad_reached_countries: JSON.stringify(query.countries),
      fields: FIELDS,
      limit: String(pageSize),
    });
    if (query.terms) params.set('search_terms', query.terms);
    if (query.pageIds?.length) {
      params.set('search_page_ids', JSON.stringify(query.pageIds));
    }

    const base = `https://graph.facebook.com/${config.meta.graphVersion}/ads_archive`;
    let url: string | null = `${base}?${params.toString()}`;
    const ads: Ad[] = [];

    while (url && ads.length < limit) {
      const res = await fetch(url);
      const json = (await res.json()) as GraphResponse;

      if (json.error) {
        throw new Error(
          `Graph API erro ${json.error.code} (${json.error.type}): ${json.error.message}`,
        );
      }

      for (const rec of json.data ?? []) {
        ads.push(this.normalize(rec));
        if (ads.length >= limit) break;
      }

      url = json.paging?.next ?? null;
    }

    return ads;
  }

  private normalize(rec: GraphAdRecord): Ad {
    return {
      id: rec.id,
      pageId: rec.page_id ?? '',
      pageName: rec.page_name ?? '(desconhecido)',
      deliveryStart: rec.ad_delivery_start_time ?? new Date().toISOString(),
      deliveryStop: rec.ad_delivery_stop_time ?? null,
      platforms: rec.publisher_platforms ?? [],
      creativeBodies: rec.ad_creative_bodies ?? [],
      creativeTitles: rec.ad_creative_link_titles ?? [],
      creativeDescriptions: rec.ad_creative_link_descriptions ?? [],
      snapshotUrl: rec.ad_snapshot_url ?? null,
      countries: rec.ad_reached_countries ?? [],
      collationCount: null,
    };
  }
}
