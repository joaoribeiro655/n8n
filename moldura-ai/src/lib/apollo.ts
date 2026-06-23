import "server-only";

/**
 * Cliente da API do Apollo.io para o gerador de listas de prospecção.
 *
 * Roda apenas no servidor (a chave nunca vai para o navegador). Endpoints:
 *  - POST /mixed_people/search -> busca pessoas (NÃO retorna e-mail real)
 *  - POST /people/bulk_match   -> enriquece até 10 por vez (revela e-mail; consome créditos)
 */

const BASE_URL = process.env.APOLLO_BASE_URL ?? "https://api.apollo.io/api/v1";

export type Icp = {
  titles?: string[];
  seniorities?: string[];
  personLocations?: string[];
  companyLocations?: string[];
  industryKeywords?: string[];
  companySizes?: string[];
  companyDomains?: string[];
  keywords?: string[];
  emailStatus?: string[];
};

export type Lead = {
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
};

type ApolloOrg = {
  name?: string;
  primary_domain?: string;
  website_url?: string;
  industry?: string;
  estimated_num_employees?: number;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
};

type ApolloPerson = {
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
};

export class ApolloError extends Error {}

function getApiKey(): string {
  const key = process.env.APOLLO_API_KEY;
  if (!key || key === "cole-sua-chave-aqui") {
    throw new ApolloError(
      "APOLLO_API_KEY não configurada no servidor. Defina-a no .env (ou nas variáveis da Vercel).",
    );
  }
  return key;
}

async function apolloPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const maxRetries = 3;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": getApiKey(),
      },
      body: JSON.stringify(body),
    });

    if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApolloError(`Apollo respondeu ${res.status}. ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }
}

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
  if (icp.keywords?.length) body.q_keywords = icp.keywords.join(" ");
  return body;
}

function mapPerson(p: ApolloPerson): Lead {
  const org = p.organization ?? p.account ?? {};
  const personLocation = [p.city, p.state, p.country].filter(Boolean).join(", ");
  const companyLocation = [org.city, org.state, org.country].filter(Boolean).join(", ");
  const phone = p.phone_numbers?.find((n) => n.sanitized_number || n.raw_number);
  return {
    id: p.id,
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    name: p.name ?? [p.first_name, p.last_name].filter(Boolean).join(" "),
    title: p.title ?? "",
    seniority: p.seniority ?? "",
    email: p.email ?? "",
    emailStatus: p.email_status ?? "",
    linkedinUrl: p.linkedin_url ?? "",
    personLocation,
    company: org.name ?? "",
    companyDomain: org.primary_domain ?? "",
    companyWebsite: org.website_url ?? "",
    companyIndustry: org.industry ?? "",
    companySize: org.estimated_num_employees ? String(org.estimated_num_employees) : "",
    companyLocation,
    companyPhone: org.phone ?? phone?.sanitized_number ?? phone?.raw_number ?? "",
  };
}

/** Só conta quantas pessoas existem para o ICP (sem baixar a lista). */
export async function countPeople(icp: Icp): Promise<number> {
  const data = await apolloPost<{ pagination?: { total_entries?: number } }>(
    "/mixed_people/search",
    buildSearchBody(icp, 1, 1),
  );
  return data.pagination?.total_entries ?? 0;
}

/** Busca pessoas paginando até `limit`, deduplicando por id/LinkedIn. */
export async function searchPeople(
  icp: Icp,
  limit: number,
  perPage = 100,
): Promise<{ leads: Lead[]; totalEntries: number }> {
  const collected: Lead[] = [];
  const seen = new Set<string>();
  let totalEntries = 0;
  const per = Math.min(perPage, 100);

  for (let page = 1; collected.length < limit; page++) {
    const data = await apolloPost<{
      people?: ApolloPerson[];
      contacts?: ApolloPerson[];
      pagination?: { total_entries?: number };
    }>("/mixed_people/search", buildSearchBody(icp, page, per));

    totalEntries = data.pagination?.total_entries ?? 0;
    const raw = [...(data.people ?? []), ...(data.contacts ?? [])];
    if (raw.length === 0) break;

    for (const person of raw) {
      const lead = mapPerson(person);
      const key = lead.id || lead.linkedinUrl || `${lead.name}|${lead.company}`;
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(lead);
      if (collected.length >= limit) break;
    }

    if (page * per >= totalEntries || page >= 500) break;
  }

  return { leads: collected, totalEntries };
}

/** Enriquece e-mails em lotes de 10 (consome créditos). Atualiza os leads in-place. */
export async function enrichEmails(leads: Lead[], revealPersonalEmails = false): Promise<number> {
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

    const data = await apolloPost<{ matches?: Array<ApolloPerson | null> }>("/people/bulk_match", {
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
  }
  return enriched;
}
