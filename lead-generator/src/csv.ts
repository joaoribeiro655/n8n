/** Escrita de CSV sem dependências externas. Compatível com Excel/Google Sheets (UTF-8 + BOM). */

import { writeFile } from 'node:fs/promises';
import type { Lead } from './apollo.ts';

interface Column {
	header: string;
	get: (l: Lead) => string;
}

const COLUMNS: Column[] = [
	{ header: 'nome', get: (l) => l.name },
	{ header: 'primeiro_nome', get: (l) => l.firstName },
	{ header: 'sobrenome', get: (l) => l.lastName },
	{ header: 'cargo', get: (l) => l.title },
	{ header: 'senioridade', get: (l) => l.seniority },
	{ header: 'email', get: (l) => l.email },
	{ header: 'status_email', get: (l) => l.emailStatus },
	{ header: 'linkedin', get: (l) => l.linkedinUrl },
	{ header: 'localizacao_pessoa', get: (l) => l.personLocation },
	{ header: 'empresa', get: (l) => l.company },
	{ header: 'dominio', get: (l) => l.companyDomain },
	{ header: 'site', get: (l) => l.companyWebsite },
	{ header: 'setor', get: (l) => l.companyIndustry },
	{ header: 'tamanho_empresa', get: (l) => l.companySize },
	{ header: 'localizacao_empresa', get: (l) => l.companyLocation },
	{ header: 'telefone_empresa', get: (l) => l.companyPhone },
];

function escape(value: string): string {
	if (value == null) return '';
	const needsQuotes = /[",\n\r]/.test(value);
	const escaped = value.replace(/"/g, '""');
	return needsQuotes ? `"${escaped}"` : escaped;
}

export async function writeCsv(path: string, leads: Lead[]): Promise<void> {
	const lines: string[] = [];
	lines.push(COLUMNS.map((c) => c.header).join(','));
	for (const lead of leads) {
		lines.push(COLUMNS.map((c) => escape(c.get(lead))).join(','));
	}
	// BOM ajuda o Excel a reconhecer UTF-8 (acentos).
	await writeFile(path, '﻿' + lines.join('\r\n') + '\r\n', 'utf8');
}
