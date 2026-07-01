#!/usr/bin/env node
/**
 * CLI do agente de anúncios escalados.
 *
 * Exemplos:
 *   ad-escala --provider mock --ai
 *   ad-escala --terms "emagrecedor" --countries BR --ai --min 60
 *   ad-escala --page-ids 12345,67890 --countries BR --json > out.json
 */
import { runAgent, type RunOptions } from './agent.js';
import { toJson, toText } from './report.js';

interface CliArgs {
  provider: 'graph' | 'mock';
  terms?: string;
  countries: string[];
  pageIds?: string[];
  activeStatus: 'ACTIVE' | 'INACTIVE' | 'ALL';
  adType: 'ALL' | 'POLITICAL_AND_ISSUE_ADS';
  limit: number;
  useAi: boolean;
  minScore: number;
  json: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    provider: 'graph',
    countries: ['BR'],
    activeStatus: 'ACTIVE',
    adType: 'ALL',
    limit: 200,
    useAi: false,
    minScore: 0,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--provider': args.provider = next() as CliArgs['provider']; break;
      case '--terms': args.terms = next(); break;
      case '--countries': args.countries = next().split(',').map((s) => s.trim().toUpperCase()); break;
      case '--page-ids': args.pageIds = next().split(',').map((s) => s.trim()); break;
      case '--status': args.activeStatus = next() as CliArgs['activeStatus']; break;
      case '--ad-type': args.adType = next() as CliArgs['adType']; break;
      case '--limit': args.limit = parseInt(next(), 10); break;
      case '--min': args.minScore = parseInt(next(), 10); break;
      case '--ai': args.useAi = true; break;
      case '--json': args.json = true; break;
      case '-h':
      case '--help': printHelp(); process.exit(0);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`
Agente de anúncios escalados — Meta Ad Library

Uso: ad-escala [opções]

  --provider <graph|mock>  Fonte de dados (default: graph). "mock" roda com dados fictícios.
  --terms <texto>          Termos de busca (ex.: "emagrecedor")
  --countries <BR,US>      Países alcançados, separados por vírgula (default: BR)
  --page-ids <id,id>       Buscar por páginas/anunciantes específicos
  --status <ACTIVE|INACTIVE|ALL>   Status dos anúncios (default: ACTIVE)
  --ad-type <ALL|POLITICAL_AND_ISSUE_ADS>   Tipo (default: ALL)
  --limit <n>              Máximo de anúncios a coletar (default: 200)
  --min <0-100>            Score mínimo para aparecer no resultado (default: 0)
  --ai                     Ativa a análise do criativo por IA (Claude)
  --json                   Saída em JSON
  -h, --help               Esta ajuda

Requer META_ACCESS_TOKEN no .env para o provider "graph".
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const opts: RunOptions = {
    provider: args.provider,
    terms: args.terms,
    countries: args.countries,
    pageIds: args.pageIds,
    activeStatus: args.activeStatus,
    adType: args.adType,
    limit: args.limit,
    useAi: args.useAi,
    minScore: args.minScore,
  };

  if (!args.json) {
    console.error(
      `Buscando na Ad Library (provider=${args.provider}, países=${args.countries.join(',')}` +
        `${args.terms ? `, termos="${args.terms}"` : ''}, IA=${args.useAi ? 'on' : 'off'})…`,
    );
  }

  const results = await runAgent(opts);
  console.log(args.json ? toJson(results) : toText(results));
}

main().catch((err) => {
  console.error('Erro:', (err as Error).message);
  process.exit(1);
});
