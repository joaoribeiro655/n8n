/**
 * Utilitários compartilhados de normalização de anúncios crus da Ad Library.
 * Usado tanto pelo provider Apify quanto pelo provider gratuito (Playwright),
 * já que ambos recebem objetos no mesmo "dialeto" da Meta (com variações).
 */
import type { Ad } from '../types.js';

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
export function toIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    const n = Number(value);
    if (!Number.isNaN(n)) return toIso(n);
    return null;
  }
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  return [value as T];
}

export function firstDefined<T>(...values: T[]): T | undefined {
  return values.find((v) => v !== undefined && v !== null && v !== '');
}

/** Extrai os textos do criativo de formatos variados de `snapshot`. */
export function extractCreative(item: Record<string, unknown>): {
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

  for (const card of asArray<Record<string, unknown>>(snapshot.cards)) {
    pushBody(card.body);
    if (typeof card.title === 'string' && card.title.trim()) titles.push(card.title.trim());
    if (typeof card.link_description === 'string' && card.link_description.trim()) {
      descriptions.push(card.link_description.trim());
    }
  }

  return { bodies, titles, descriptions };
}

/** Converte um objeto cru da Meta (Apify ou GraphQL público) para `Ad`. */
export function normalizeRawAd(item: Record<string, unknown>, fallbackCountry: string): Ad {
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

  const pageId = String(firstDefined(item.pageID, item.page_id, snapshot.page_id) ?? '');
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

  const countries = asArray<string>(
    firstDefined(item.reachedCountries, item.reached_countries, item.ad_reached_countries),
  ).map(String);

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
    countries: countries.length ? countries : [fallbackCountry],
    collationCount,
  };
}

/**
 * Percorre recursivamente um payload JSON e coleta todo objeto que pareça um
 * anúncio (tem `ad_archive_id`/`adArchiveID`). Resiliente a mudanças na
 * estrutura do GraphQL da Ad Library.
 */
export function collectAdNodes(
  value: unknown,
  out: Map<string, Record<string, unknown>>,
  depth = 0,
): void {
  if (depth > 12 || value == null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const el of value) collectAdNodes(el, out, depth + 1);
    return;
  }
  const obj = value as Record<string, unknown>;
  const id = obj.ad_archive_id ?? obj.adArchiveID;
  if (id != null && String(id).length > 0) {
    out.set(String(id), obj);
    // não retorna: pode haver `collated_results` aninhados com outros anúncios
  }
  for (const key of Object.keys(obj)) collectAdNodes(obj[key], out, depth + 1);
}
