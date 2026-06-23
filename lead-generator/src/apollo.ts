/**
 * Cliente mínimo da API do Apollo.io (sem dependências externas, usa fetch nativo).
 *
 * Endpoints usados:
 *  - POST /mixed_people/search  -> busca pessoas no banco do Apollo (NÃO retorna e-mail real)
 *  - POST /people/bulk_match    -> enriquece até 10 pessoas por vez (revela e-mail; consome créditos)
 */

import type { Icp } from './config.ts';

const BASE_URL = process.env.APOLLO_BASE_URL ?? 'https://api.apollo.io/api/v1';

export interface Lead {
	id?: string;
	firstName: string;
	lastName: string;
	name: string;
	title: string;
	seniority: string;
	email: string;
	emailStatus: string;
	linkedinUrl: string;
	personLocation: string;
	company: string;
	companyDomain: string;
	companyWebsite: string;
	companyIndustry: string;
	companySize: string;
	companyLocation: string;
	companyPhone: string;
}

interface ApolloPerson {
	id?: string;
	first_name?: string;
	last_name?: string;
	name?: string;
	title?: string;
	seniority?: string;
	email?: string;
	email_status?: string;
	linkedin_url?: string;
	city?: string;
	state?: string;
	country?: string;
	phone_numbers?: Array<{ raw_number?: string; sanitized_number?: string }>;
	organization?: ApolloOrg;
	account?: ApolloOrg;
}

interface ApolloOrg {
	name?: string;
	primary_domain?: string;
	website_url?: string;
	industry?: string;
	estimated_num_employees?: number;
	phone?: string;
	city?: string;
	state?: string;
	country?: string;
}

function getApiKey(): string {
	const key = process.env.APOLLO_API_KEY;
	if (!key || key === 'cole-sua-chave-aqui') {
		throw new Error(
			'APOLLO_API_KEY não configurada. Copie .env.example para .env e cole sua chave do Apollo.',
		);
	}
	return key;
}

async function apolloPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
	const url = `${BASE_URL}${path}`;
	const maxRetries = 4;
	for (let attempt = 0; ; attempt++) {
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache',
				'X-Api-Key': getApiKey(),
			},
			body: JSON.stringify(body),
		});

		// Rate limit ou erro temporário: backoff exponencial.
		if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
			const waitMs = 2000 * 2 ** attempt;
			console.warn(`  ⚠️  Apollo respondeu ${res.status}. Tentando de novo em ${waitMs / 1000}s…`);
			await new Promise((r) => setTimeout(r, waitMs));
			continue;
		}

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`Apollo ${path} falhou (${res.status}): ${text.slice(0, 300)}`);
		}
		return (await res.json()) as T;
	}
}

/** Monta o corpo da busca de pessoas a partir do ICP. */
function buildSearchBody(icp: Icp, page: number, perPage: number): Record<string, unknown> {
	const body: Record<string, unknown> = { page, per_page: perPage };
	if (icp.titles?.length) body.person_titles = icp.titles;
	if (icp.seniorities?.length) body.person_seniorities = icp.seniorities;
	if (icp.personLocations?.length) body.person_locations = icp.personLocations;
	if (icp.companyLocations?.length) body.organization_locations = icp.companyLocations;
	if (icp.industryKeywords?.length) body.q_organization_keyword_tags = icp.industryKeywords;
	if (icp.companySizes?.length) body.organization_num_employees_ranges = icp.companySizes;
	if (icp.companyDomains?.length) body.q_organization_domains_list = icp.companyDomains;
	if (icp.emailStatus?.length) body.contact_email_status = icp.emailStatus;
	if (icp.keywords?.length) body.q_keywords = icp.keywords.join(' ');
	return body;
}

function mapPerson(p: ApolloPerson): Lead {
	const org = p.organization ?? p.account ?? {};
	const personLocation = [p.city, p.state, p.country].filter(Boolean).join(', ');
	const companyLocation = [org.city, org.state, org.country].filter(Boolean).join(', ');
	const phone = p.phone_numbers?.find((n) => n.sanitized_number || n.raw_number);
	return {
		id: p.id,
		firstName: p.first_name ?? '',
		lastName: p.last_name ?? '',
		name: p.name ?? [p.first_name, p.last_name].filter(Boolean).join(' '),
		title: p.title ?? '',
		seniority: p.seniority ?? '',
		email: p.email ?? '',
		emailStatus: p.email_status ?? '',
		linkedinUrl: p.linkedin_url ?? '',
		personLocation,
		company: org.name ?? '',
		companyDomain: org.primary_domain ?? '',
		companyWebsite: org.website_url ?? '',
		companyIndustry: org.industry ?? '',
		companySize: org.estimated_num_employees ? String(org.estimated_num_employees) : '',
		companyLocation,
		companyPhone: org.phone ?? phone?.sanitized_number ?? phone?.raw_number ?? '',
	};
}

export interface SearchResult {
	leads: Lead[];
	totalEntries: number;
}

/** Faz uma única página de busca. Útil para dry-run (saber o total). */
export async function searchPeoplePage(
	icp: Icp,
	page: number,
	perPage: number,
): Promise<SearchResult> {
	const data = await apolloPost<{
		people?: ApolloPerson[];
		contacts?: ApolloPerson[];
		pagination?: { total_entries?: number };
	}>('/mixed_people/search', buildSearchBody(icp, page, perPage));
	const raw = [...(data.people ?? []), ...(data.contacts ?? [])];
	return {
		leads: raw.map(mapPerson),
		totalEntries: data.pagination?.total_entries ?? raw.length,
	};
}

/** Busca pessoas paginando até atingir `limit`. Deduplica por id/LinkedIn. */
export async function searchPeople(
	icp: Icp,
	limit: number,
	perPage: number,
): Promise<{ leads: Lead[]; totalEntries: number }> {
	const collected: Lead[] = [];
	const seen = new Set<string>();
	let totalEntries = 0;
	const per = Math.min(perPage, 100);

	for (let page = 1; collected.length < limit; page++) {
		const { leads, totalEntries: total } = await searchPeoplePage(icp, page, per);
		totalEntries = total;
		if (leads.length === 0) break;

		for (const lead of leads) {
			const key = lead.id || lead.linkedinUrl || `${lead.name}|${lead.company}`;
			if (seen.has(key)) continue;
			seen.add(key);
			collected.push(lead);
			if (collected.length >= limit) break;
		}

		// Apollo limita a 500 páginas; e se já pegamos tudo, paramos.
		if (page * per >= totalEntries || page >= 500) break;
		console.log(`  • ${collected.length}/${Math.min(limit, totalEntries)} leads coletados…`);
	}

	return { leads: collected, totalEntries };
}

interface BulkMatchResponse {
	matches?: Array<ApolloPerson | null>;
}

/**
 * Enriquece leads em lotes de 10 para revelar e-mails (consome créditos do Apollo).
 * Atualiza email/emailStatus/companyPhone in-place quando há match.
 */
export async function enrichEmails(leads: Lead[], revealPersonalEmails: boolean): Promise<number> {
	let enriched = 0;
	for (let i = 0; i < leads.length; i += 10) {
		const batch = leads.slice(i, i + 10);
		const details = batch.map((l) => ({
			id: l.id,
			first_name: l.firstName,
			last_name: l.lastName,
			name: l.name,
			organization_name: l.company,
			domain: l.companyDomain,
			linkedin_url: l.linkedinUrl || undefined,
		}));

		const data = await apolloPost<BulkMatchResponse>('/people/bulk_match', {
			details,
			reveal_personal_emails: revealPersonalEmails,
		});

		const matches = data.matches ?? [];
		for (let j = 0; j < batch.length; j++) {
			const m = matches[j];
			if (!m) continue;
			const mapped = mapPerson(m);
			if (mapped.email) {
				batch[j].email = mapped.email;
				batch[j].emailStatus = mapped.emailStatus || batch[j].emailStatus;
				enriched++;
			}
			if (!batch[j].companyPhone && mapped.companyPhone) batch[j].companyPhone = mapped.companyPhone;
		}
		console.log(`  • enriquecidos ${Math.min(i + 10, leads.length)}/${leads.length}…`);
	}
	return enriched;
}
