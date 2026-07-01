/**
 * Orquestrador: busca anúncios no provider escolhido, calcula os sinais de
 * escala, opcionalmente roda a análise por IA e devolve os anúncios ranqueados.
 */
import { analyzeMany } from './ai/analyze.js';
import { ApifyProvider } from './providers/apify.js';
import { FreeScraperProvider } from './providers/free.js';
import { GraphApiProvider } from './providers/graphApi.js';
import { MockProvider } from './providers/mock.js';
import { combineScores, scoreAds, type ScoringWeights } from './scoring/escalation.js';
import type { Ad, AdLibraryProvider, ProviderKind, ScoredAd, SearchQuery } from './types.js';

export interface RunOptions extends SearchQuery {
  provider: ProviderKind;
  /**
   * Nichos a pesquisar. Cada nicho vira uma busca separada e os resultados são
   * unidos (dedup por ID). Se vazio, usa `terms`.
   */
  niches?: string[];
  /** Rodar análise por IA do criativo */
  useAi: boolean;
  /** Peso dos eixos heurísticos (opcional) */
  weights?: ScoringWeights;
  /** Score mínimo para entrar no resultado (0-100) */
  minScore?: number;
}

function makeProvider(kind: ProviderKind): AdLibraryProvider {
  switch (kind) {
    case 'mock':
      return new MockProvider();
    case 'apify':
      return new ApifyProvider();
    case 'graph':
      return new GraphApiProvider();
    case 'free':
    default:
      return new FreeScraperProvider();
  }
}

export async function runAgent(opts: RunOptions): Promise<ScoredAd[]> {
  const provider = makeProvider(opts.provider);

  // Lista de termos a buscar: nichos explícitos, ou o `terms` único.
  const searches = opts.niches?.length ? opts.niches : [opts.terms ?? ''];

  const byId = new Map<string, Ad>();
  for (const term of searches) {
    const found = await provider.search({ ...opts, terms: term || undefined });
    for (const ad of found) {
      if (ad.id) byId.set(ad.id, ad);
    }
  }
  const ads = [...byId.values()];
  if (ads.length === 0) return [];

  let scored = scoreAds(ads, opts.weights);

  if (opts.useAi) {
    const analyses = await analyzeMany(ads);
    scored = scored.map((s) => {
      const analysis = analyses.get(s.ad.id);
      return {
        ...s,
        analysis,
        finalScore: combineScores(s.heuristicScore, analysis?.score),
      };
    });
  }

  const min = opts.minScore ?? 0;
  return scored
    .filter((s) => s.finalScore >= min)
    .sort((a, b) => b.finalScore - a.finalScore);
}
