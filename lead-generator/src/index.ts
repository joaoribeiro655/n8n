#!/usr/bin/env -S npx tsx
/**
 * Gerador de listas para disparos frios (cold outreach), no estilo Apollo.
 *
 * Uso:
 *   npx tsx src/index.ts --icp icp.json --limit 200 --enrich --output leads.csv
 *
 * Veja todas as opções com:  npx tsx src/index.ts --help
 */

import { loadDotEnv, loadIcp, type RunConfig } from './config.ts';
import { enrichEmails, searchPeople, searchPeoplePage } from './apollo.ts';
import { writeCsv } from './csv.ts';

function parseArgs(argv: string[]): RunConfig & { help: boolean } {
	const cfg: RunConfig & { help: boolean } = {
		icpPath: 'icp.json',
		limit: 100,
		perPage: 100,
		enrich: false,
		revealPersonalEmails: false,
		output: '',
		dryRun: false,
		help: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = () => argv[++i];
		switch (arg) {
			case '--icp':
			case '-i':
				cfg.icpPath = next();
				break;
			case '--limit':
			case '-l':
				cfg.limit = Number(next());
				break;
			case '--per-page':
				cfg.perPage = Number(next());
				break;
			case '--enrich':
			case '-e':
				cfg.enrich = true;
				break;
			case '--reveal-personal':
				cfg.revealPersonalEmails = true;
				break;
			case '--output':
			case '-o':
				cfg.output = next();
				break;
			case '--dry-run':
				cfg.dryRun = true;
				break;
			case '--help':
			case '-h':
				cfg.help = true;
				break;
			default:
				console.warn(`Opção desconhecida ignorada: ${arg}`);
		}
	}

	if (!cfg.output) {
		const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		cfg.output = `leads-${stamp}.csv`;
	}
	return cfg;
}

const HELP = `
Gerador de listas para disparos frios (cold outreach) — via Apollo.io

USO:
  npx tsx src/index.ts [opções]

OPÇÕES:
  -i, --icp <arquivo>      Arquivo JSON com o ICP (padrão: icp.json)
  -l, --limit <n>          Quantidade total de leads (padrão: 100)
      --per-page <n>       Resultados por página, máx 100 (padrão: 100)
  -e, --enrich             Enriquecer e-mails — CONSOME CRÉDITOS do Apollo (1 por match)
      --reveal-personal    Ao enriquecer, revelar também e-mails pessoais
  -o, --output <arquivo>   CSV de saída (padrão: leads-<data>.csv)
      --dry-run            Só mostra quantos leads existem para o ICP (não baixa nem gasta créditos)
  -h, --help               Mostra esta ajuda

EXEMPLOS:
  # Ver o tamanho do mercado para o ICP, sem gastar nada:
  npx tsx src/index.ts --icp icp.json --dry-run

  # Gerar 300 leads (sem e-mail, sem créditos):
  npx tsx src/index.ts --icp icp.json --limit 300 -o concessionarias.csv

  # Gerar 100 leads JÁ com e-mails verificados (gasta créditos):
  npx tsx src/index.ts --icp icp.json --limit 100 --enrich
`;

async function main(): Promise<void> {
	const cfg = parseArgs(process.argv.slice(2));
	if (cfg.help) {
		console.log(HELP);
		return;
	}

	await loadDotEnv();
	const icp = await loadIcp(cfg.icpPath);

	console.log(`\n🎯 ICP carregado de "${cfg.icpPath}"`);
	console.log(`   ${JSON.stringify(icp)}\n`);

	if (cfg.dryRun) {
		const { totalEntries } = await searchPeoplePage(icp, 1, 1);
		console.log(`📊 O Apollo encontra ~${totalEntries.toLocaleString('pt-BR')} pessoas para esse ICP.`);
		console.log('   (rode sem --dry-run para baixar e gerar o CSV)\n');
		return;
	}

	console.log(`🔎 Buscando até ${cfg.limit} leads no Apollo…`);
	const { leads, totalEntries } = await searchPeople(icp, cfg.limit, cfg.perPage);
	console.log(`✅ ${leads.length} leads coletados (de ~${totalEntries.toLocaleString('pt-BR')} disponíveis).\n`);

	if (leads.length === 0) {
		console.log('Nenhum lead encontrado. Tente afrouxar os filtros do ICP.');
		return;
	}

	if (cfg.enrich) {
		console.log(`💳 Enriquecendo e-mails (até ${leads.length} créditos do Apollo)…`);
		const count = await enrichEmails(leads, cfg.revealPersonalEmails);
		console.log(`✅ ${count} e-mails revelados.\n`);
	} else {
		console.log('ℹ️  Sem --enrich: a busca NÃO traz e-mails reais. Use --enrich para revelá-los (gasta créditos).\n');
	}

	await writeCsv(cfg.output, leads);
	console.log(`💾 CSV salvo em: ${cfg.output}`);
	const withEmail = leads.filter((l) => l.email).length;
	console.log(`   ${leads.length} linhas · ${withEmail} com e-mail · pronto para importar no seu disparador.\n`);
}

main().catch((err) => {
	console.error(`\n❌ ${(err as Error).message}\n`);
	process.exit(1);
});
