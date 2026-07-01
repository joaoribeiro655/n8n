/**
 * Orquestrador: busca anúncios no provider escolhido, calcula os sinais de
 * escala, opcionalmente roda a análise por IA e devolve os anúncios ranqueados.
 */
import { analyzeMany } from './ai/analyze.js';
import { GraphApiProvider } from './providers/graphApi.js';
import { MockProvider } from './providers/mock.js';
import { combineScores, scoreAds, type ScoringWeights } from './scoring/escalation.js';
import type { AdLibraryProvider, ScoredAd, SearchQuery } from './types.js';

export interface RunOptions extends SearchQuery {
  provider: 'graph' | 'mock';
  /** Rodar análise por IA do criativo */
  useAi: boolean;
  /** Peso dos eixos heurísticos (opcional) */
  weights?: ScoringWeights;
  /** Score mínimo para entrar no resultado (0-100) */
  minScore?: number;
}

function makeProvider(kind: 'graph' | 'mock'): AdLibraryProvider {
  return kind === 'mock' ? new MockProvider() : new GraphApiProvider();
}

export async function runAgent(opts: RunOptions): Promise<ScoredAd[]> {
  const provider = makeProvider(opts.provider);

  const ads = await provider.search(opts);
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
