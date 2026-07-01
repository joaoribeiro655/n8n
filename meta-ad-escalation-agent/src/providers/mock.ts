/**
 * Provider de exemplo com dados fictícios. Serve para testar o pipeline de
 * scoring e a análise por IA sem precisar de token da Meta.
 */
import type { Ad, AdLibraryProvider, SearchQuery } from '../types.js';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const SAMPLE: Ad[] = [
  {
    id: 'mock-1',
    pageId: '100',
    pageName: 'Loja Escala Turbo',
    deliveryStart: daysAgo(95),
    deliveryStop: null,
    platforms: ['facebook', 'instagram', 'audience_network', 'messenger'],
    creativeBodies: [
      'CANSADO de tentar de tudo? 🔥 Mais de 12.000 clientes já transformaram o corpo com nosso método. Só HOJE: 50% OFF + frete grátis. Corre que acaba!',
    ],
    creativeTitles: ['Método aprovado por milhares'],
    creativeDescriptions: ['Garantia de 30 dias ou seu dinheiro de volta'],
    snapshotUrl: 'https://www.facebook.com/ads/library/?id=mock-1',
    countries: ['BR'],
    collationCount: 8,
  },
  {
    id: 'mock-2',
    pageId: '100',
    pageName: 'Loja Escala Turbo',
    deliveryStart: daysAgo(60),
    deliveryStop: null,
    platforms: ['facebook', 'instagram'],
    creativeBodies: [
      'A oferta que todo mundo está falando. Aproveite antes que acabe o estoque.',
    ],
    creativeTitles: ['Últimas unidades'],
    creativeDescriptions: [],
    snapshotUrl: 'https://www.facebook.com/ads/library/?id=mock-2',
    countries: ['BR'],
    collationCount: 8,
  },
  {
    id: 'mock-3',
    pageId: '200',
    pageName: 'Teste Rápido ME',
    deliveryStart: daysAgo(3),
    deliveryStop: null,
    platforms: ['facebook'],
    creativeBodies: ['Conheça nosso produto novo.'],
    creativeTitles: ['Novidade'],
    creativeDescriptions: [],
    snapshotUrl: 'https://www.facebook.com/ads/library/?id=mock-3',
    countries: ['BR'],
    collationCount: 1,
  },
];

export class MockProvider implements AdLibraryProvider {
  readonly name = 'mock';

  async search(_query: SearchQuery): Promise<Ad[]> {
    return SAMPLE;
  }
}
