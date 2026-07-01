/**
 * Análise do criativo por IA (Claude). Recebe os textos do anúncio e devolve
 * um score 0-100 de potencial de escala, o ângulo e a oferta identificados.
 *
 * Usa tool use forçado (uma tool com input_schema + tool_choice) para garantir
 * um JSON estruturado e válido — compatível com qualquer versão do SDK.
 */
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import type { Ad, CreativeAnalysis } from '../types.js';

const SYSTEM = `Você é um analista de tráfego pago sênior, especialista em anúncios da Meta (Facebook/Instagram).
Sua tarefa é avaliar o CRIATIVO de um anúncio e estimar o potencial de que ele seja/venha a ser um anúncio ESCALADO — ou seja, um anúncio vencedor que o anunciante mantém rodando com alto investimento.

Considere sinais no texto: clareza da oferta, força do gatilho (urgência, prova social, curiosidade, dor/benefício), presença de CTA, promessa concreta, e "cara" de criativo de resposta direta (não institucional).

Seja criterioso: criativos genéricos/institucionais têm score baixo; criativos de resposta direta bem construídos têm score alto.`;

const SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    score: {
      type: 'integer',
      description: 'Potencial de escala de 0 a 100',
    },
    angle: {
      type: 'string',
      description: 'Ângulo/gatilho principal (ex.: prova social, urgência, curiosidade, dor)',
    },
    offer: {
      type: 'string',
      description: 'Oferta detectada (ex.: 50% off, frete grátis, isca de e-book, ou "nenhuma clara")',
    },
    rationale: {
      type: 'string',
      description: 'Justificativa em uma frase',
    },
  },
  required: ['score', 'angle', 'offer', 'rationale'],
};

function creativeText(ad: Ad): string {
  const parts = [
    ...ad.creativeTitles.map((t) => `Título: ${t}`),
    ...ad.creativeBodies.map((b) => `Corpo: ${b}`),
    ...ad.creativeDescriptions.map((d) => `Descrição: ${d}`),
  ];
  return parts.join('\n') || '(sem texto de criativo disponível)';
}

export class CreativeAnalyzer {
  private readonly client: Anthropic;

  constructor() {
    // O SDK resolve a credencial de ANTHROPIC_API_KEY ou de um perfil `ant auth login`.
    this.client = config.anthropic.apiKey
      ? new Anthropic({ apiKey: config.anthropic.apiKey })
      : new Anthropic();
  }

  async analyze(ad: Ad): Promise<CreativeAnalysis> {
    const response = await this.client.messages.create({
      model: config.anthropic.model,
      max_tokens: 1024,
      system: SYSTEM,
      tools: [
        {
          name: 'registrar_analise',
          description: 'Registra a análise do potencial de escala do criativo.',
          input_schema: SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'registrar_analise' },
      messages: [
        {
          role: 'user',
          content: `Anúncio da página "${ad.pageName}".\nPosicionamentos: ${ad.platforms.join(', ') || 'n/d'}.\n\nCriativo:\n${creativeText(ad)}`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === 'tool_use');
    if (!block || block.type !== 'tool_use') {
      throw new Error('Resposta da IA sem tool_use.');
    }
    const parsed = block.input as CreativeAnalysis;
    parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));
    return parsed;
  }
}

/**
 * Analisa vários anúncios com um limite de concorrência para não estourar
 * rate limits nem custo descontrolado.
 */
export async function analyzeMany(
  ads: Ad[],
  concurrency = 4,
): Promise<Map<string, CreativeAnalysis>> {
  const analyzer = new CreativeAnalyzer();
  const out = new Map<string, CreativeAnalysis>();
  let index = 0;

  async function worker(): Promise<void> {
    while (index < ads.length) {
      const current = ads[index++];
      try {
        out.set(current.id, await analyzer.analyze(current));
      } catch (err) {
        // Falha na análise não deve derrubar o pipeline inteiro.
        console.error(`[ai] falha ao analisar ${current.id}:`, (err as Error).message);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, ads.length) }, worker),
  );
  return out;
}
