/**
 * Formatação do resultado: tabela legível no terminal e export JSON.
 */
import type { ScoredAd } from './types.js';

function bar(score: number): string {
  const filled = Math.round(score / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

export function toText(results: ScoredAd[]): string {
  if (results.length === 0) return 'Nenhum anúncio encontrado com os critérios informados.';

  const lines: string[] = [];
  lines.push(`\n🏆 ${results.length} anúncio(s) ranqueados por escala:\n`);

  results.forEach((r, i) => {
    const { ad, signals, finalScore, analysis } = r;
    lines.push(`${i + 1}. [${bar(finalScore)}] ${finalScore}/100 — ${ad.pageName}`);
    lines.push(
      `   ⏱  ${signals.daysActive} dias no ar${signals.isActive ? ' (ativo)' : ' (parado)'}` +
        `   🔁 ${signals.variations} variação(ões)` +
        `   📱 ${signals.platformCount} posicionamento(s): ${ad.platforms.join(', ') || 'n/d'}`,
    );
    if (analysis) {
      lines.push(
        `   🤖 IA ${analysis.score}/100 · ângulo: ${analysis.angle} · oferta: ${analysis.offer}`,
      );
      lines.push(`      "${analysis.rationale}"`);
    }
    const body = ad.creativeBodies[0]?.slice(0, 120);
    if (body) lines.push(`   💬 ${body}${ad.creativeBodies[0].length > 120 ? '…' : ''}`);
    if (ad.snapshotUrl) lines.push(`   🔗 ${ad.snapshotUrl}`);
    lines.push('');
  });

  return lines.join('\n');
}

export function toJson(results: ScoredAd[]): string {
  return JSON.stringify(results, null, 2);
}
