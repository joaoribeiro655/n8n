/**
 * Definição do ICP (Ideal Customer Profile) e carregamento de configuração.
 *
 * O ICP é descrito num arquivo JSON simples. Cada campo é opcional — quanto mais
 * preenchido, mais filtrada (e mais qualificada) fica a lista. Os nomes dos campos
 * são "humanos"; a tradução para os parâmetros da API do Apollo é feita em apollo.ts.
 */

import { readFile } from 'node:fs/promises';

export interface Icp {
	/** Cargos a procurar. Ex.: ["dono", "gerente comercial", "diretor"] */
	titles?: string[];
	/** Níveis de senioridade. Valores aceitos pelo Apollo: owner, founder, c_suite, partner, vp, head, director, manager, senior, entry, intern */
	seniorities?: string[];
	/** Localização das PESSOAS. Ex.: ["São Paulo, Brazil", "Brazil"] */
	personLocations?: string[];
	/** Localização (HQ) das EMPRESAS. Ex.: ["Brazil"] */
	companyLocations?: string[];
	/** Setores/palavras-chave da empresa. Ex.: ["car dealership", "automotive", "concessionária"] */
	industryKeywords?: string[];
	/** Faixas de número de funcionários. Ex.: ["1,10", "11,50", "51,200"] */
	companySizes?: string[];
	/** Domínios específicos de empresas para filtrar. Ex.: ["empresa.com.br"] */
	companyDomains?: string[];
	/** Busca livre por palavras-chave (nome, cargo, empresa…). */
	keywords?: string[];
	/** Status de e-mail desejado. Ex.: ["verified", "likely to engage"] */
	emailStatus?: string[];
}

export interface RunConfig {
	/** Caminho do arquivo de ICP (JSON). */
	icpPath: string;
	/** Quantos leads no total buscar. Padrão: 100. */
	limit: number;
	/** Resultados por página (máx. 100 no Apollo). Padrão: 100. */
	perPage: number;
	/** Se true, enriquece para revelar e-mails (CONSOME CRÉDITOS do Apollo, 1 por match). */
	enrich: boolean;
	/** Revelar também e-mails pessoais ao enriquecer. */
	revealPersonalEmails: boolean;
	/** Caminho do CSV de saída. Padrão: leads-<timestamp>.csv */
	output: string;
	/** Apenas mostrar quantos resultados existem, sem baixar tudo nem enriquecer. */
	dryRun: boolean;
}

export async function loadIcp(path: string): Promise<Icp> {
	let raw: string;
	try {
		raw = await readFile(path, 'utf8');
	} catch {
		throw new Error(`Não consegui ler o arquivo de ICP em "${path}". Crie um (veja icp.example.json).`);
	}
	let icp: Icp;
	try {
		icp = JSON.parse(raw) as Icp;
	} catch (err) {
		throw new Error(`O ICP "${path}" não é um JSON válido: ${(err as Error).message}`);
	}
	return icp;
}

/** Lê variáveis de um arquivo .env simples (sem dependências externas). */
export async function loadDotEnv(path = '.env'): Promise<void> {
	let raw: string;
	try {
		raw = await readFile(path, 'utf8');
	} catch {
		return; // .env é opcional; a chave pode vir do ambiente
	}
	for (const line of raw.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (!(key in process.env)) process.env[key] = value;
	}
}
