/**
 * Modelo de dados normalizado, independente da fonte (Graph API oficial,
 * scraper, mock). Cada provider converte a resposta bruta da Meta para `Ad`.
 */
export interface Ad {
  /** ID do anúncio na biblioteca */
  id: string;
  /** ID da página/anunciante */
  pageId: string;
  /** Nome da página/anunciante */
  pageName: string;
  /** Início da veiculação (ISO 8601) */
  deliveryStart: string;
  /** Fim da veiculação, se já parou (ISO 8601). null = ainda ativo. */
  deliveryStop: string | null;
  /** Plataformas/posicionamentos: facebook, instagram, audience_network, messenger... */
  platforms: string[];
  /** Textos do criativo (corpo, títulos, descrições) concatenados por bloco */
  creativeBodies: string[];
  creativeTitles: string[];
  creativeDescriptions: string[];
  /** URL do snapshot público do anúncio */
  snapshotUrl: string | null;
  /** Países alcançados */
  countries: string[];
  /**
   * Quantidade de anúncios agrupados sob o mesmo criativo, quando a fonte
   * expõe (a Ad Library agrupa variações). null se desconhecido.
   */
  collationCount: number | null;
}

/** Critérios de busca passados ao provider. */
export interface SearchQuery {
  /** Termos de busca (ex.: "emagrecedor", nome de concorrente) */
  terms?: string;
  /** Países ISO-2 alcançados (ex.: ["BR"]). Obrigatório na Graph API. */
  countries: string[];
  /** Filtra por páginas específicas (IDs) */
  pageIds?: string[];
  /** ALL | POLITICAL_AND_ISSUE_ADS */
  adType?: 'ALL' | 'POLITICAL_AND_ISSUE_ADS';
  /** Status: ACTIVE | INACTIVE | ALL */
  activeStatus?: 'ACTIVE' | 'INACTIVE' | 'ALL';
  /** Máximo de anúncios a coletar (paginação automática até esse teto) */
  limit?: number;
}

/** Fontes de dados disponíveis. */
export type ProviderKind = 'graph' | 'apify' | 'mock';

/** Contrato que toda fonte de dados da Ad Library deve cumprir. */
export interface AdLibraryProvider {
  readonly name: string;
  search(query: SearchQuery): Promise<Ad[]>;
}

/** Sinais brutos de escala calculados por heurística sobre um anúncio. */
export interface EscalationSignals {
  /** Dias no ar (do início até agora, ou até a parada) */
  daysActive: number;
  /** Quantas variações o anunciante roda do mesmo criativo/tema */
  variations: number;
  /** Número de plataformas/posicionamentos simultâneos */
  platformCount: number;
  /** Anúncio ainda ativo? */
  isActive: boolean;
}

/** Resultado da análise por IA do criativo. */
export interface CreativeAnalysis {
  /** 0-100: potencial de escala percebido no criativo */
  score: number;
  /** Ângulo/gatilho principal identificado (ex.: "prova social", "urgência") */
  angle: string;
  /** Oferta detectada (ex.: "frete grátis", "50% off", "isca de e-book") */
  offer: string;
  /** Justificativa curta */
  rationale: string;
}

/** Anúncio enriquecido com score de escala e análise. */
export interface ScoredAd {
  ad: Ad;
  signals: EscalationSignals;
  /** Score heurístico 0-100 (tempo + variações + posicionamentos) */
  heuristicScore: number;
  /** Análise por IA (opcional, só se habilitada) */
  analysis?: CreativeAnalysis;
  /** Score final combinado 0-100 */
  finalScore: number;
}
