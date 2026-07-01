/**
 * Heurística de "escala": combina tempo no ar, número de variações e
 * quantidade de posicionamentos num score 0-100.
 *
 * Lógica: um anúncio escalado costuma ficar MUITO tempo no ar (o anunciante
 * só mantém no ar o que dá lucro), rodar VÁRIAS variações do mesmo tema
 * (teste em escala) e cobrir MÚLTIPLOS posicionamentos ao mesmo tempo.
 */
import type { Ad, EscalationSignals, ScoredAd } from '../types.js';

export interface ScoringWeights {
  time: number;
  variations: number;
  platforms: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  time: 0.5,
  variations: 0.3,
  platforms: 0.2,
};

/** Satura um valor em [0,1] a partir de um teto (ex.: 90 dias = escala máxima). */
function saturate(value: number, ceiling: number): number {
  return Math.max(0, Math.min(1, value / ceiling));
}

function daysBetween(startIso: string, endIso: string | null): number {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
}

/**
 * Conta quantas variações cada anunciante roda. Prioriza `collationCount`
 * (quando a fonte agrupa variações); senão, conta anúncios por página no
 * conjunto coletado.
 */
export function countVariations(ads: Ad[]): Map<string, number> {
  const byPage = new Map<string, number>();
  for (const ad of ads) {
    byPage.set(ad.pageId, (byPage.get(ad.pageId) ?? 0) + 1);
  }
  return byPage;
}

export function computeSignals(
  ad: Ad,
  variationsByPage: Map<string, number>,
): EscalationSignals {
  const daysActive = daysBetween(ad.deliveryStart, ad.deliveryStop);
  const variations =
    ad.collationCount ?? variationsByPage.get(ad.pageId) ?? 1;
  return {
    daysActive: Math.round(daysActive),
    variations,
    platformCount: ad.platforms.length,
    isActive: ad.deliveryStop === null,
  };
}

export function heuristicScore(
  signals: EscalationSignals,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): number {
  // Tetos: 90 dias no ar, 10 variações, 4 posicionamentos = 100% em cada eixo.
  const timeScore = saturate(signals.daysActive, 90);
  const variationScore = saturate(signals.variations, 10);
  const platformScore = saturate(signals.platformCount, 4);

  const raw =
    timeScore * weights.time +
    variationScore * weights.variations +
    platformScore * weights.platforms;

  return Math.round(raw * 100);
}

/**
 * Combina score heurístico com score da IA. Se não houve análise por IA,
 * o final é o próprio heurístico.
 */
export function combineScores(heuristic: number, aiScore?: number): number {
  if (aiScore === undefined) return heuristic;
  return Math.round(heuristic * 0.6 + aiScore * 0.4);
}

/** Aplica o pipeline de scoring a um conjunto de anúncios (sem IA ainda). */
export function scoreAds(ads: Ad[], weights?: ScoringWeights): ScoredAd[] {
  const variationsByPage = countVariations(ads);
  return ads.map((ad) => {
    const signals = computeSignals(ad, variationsByPage);
    const hs = heuristicScore(signals, weights);
    return {
      ad,
      signals,
      heuristicScore: hs,
      finalScore: hs,
    };
  });
}
