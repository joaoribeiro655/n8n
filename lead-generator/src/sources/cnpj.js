"use strict";

/**
 * Fonte CNPJ / Receita Federal (grátis):
 *  - listByCnae(): lista empresas por CNAE + município usando a API pública da
 *    Casa dos Dados (best-effort; pode ter limite de uso).
 *  - enrichByCnpj(): enriquece um CNPJ específico via BrasilAPI (estável).
 *
 * CNAEs úteis para concessionárias:
 *  4511-1/01  Comércio a varejo de automóveis, camionetas e utilitários novos
 *  4511-1/02  Comércio a varejo de automóveis, camionetas e utilitários usados
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const CASA_DOS_DADOS = "https://api.casadosdados.com.br/v2/public/cnpj/search";
const BRASILAPI = "https://brasilapi.com.br/api/cnpj/v1/";

function onlyDigits(s) {
  return (s || "").replace(/\D/g, "");
}

/**
 * Escolhe o sócio que provavelmente é o decisor a partir do QSA da Receita.
 * Prioriza quem é administrador/diretor/presidente; senão, o primeiro sócio.
 */
function pickDecisorFromQsa(qsa) {
  const partners = (Array.isArray(qsa) ? qsa : [])
    .map((s) => ({
      name: (s.nome_socio || s.nome || "").trim(),
      role: (s.qualificacao_socio || s.qual || "").trim(),
    }))
    .filter((p) => p.name);
  if (!partners.length) return { name: "", role: "", partners };
  const chefe =
    partners.find((p) => /administrador|presidente|diretor|titular/i.test(p.role)) || partners[0];
  return { name: chefe.name, role: chefe.role, partners };
}

function mapCasaItem(item, city) {
  const phone = item.ddd_telefone_1 || item.telefone || "";
  return {
    company: item.nome_fantasia || item.razao_social || "",
    name: "",
    category: item.cnae_fiscal_descricao || "",
    phone,
    whatsapp: "",
    email: item.email || "",
    website: "",
    instagram: "",
    address: [item.logradouro, item.numero, item.bairro, item.municipio, item.uf]
      .filter(Boolean)
      .join(", "),
    city: item.municipio || city || "",
    rating: "",
    reviews: "",
    cnpj: onlyDigits(item.cnpj),
    source: "cnpj",
    mapsUrl: "",
    instagramHandle: "",
  };
}

/**
 * Lista empresas por CNAE + (uf/município). Best-effort contra a Casa dos Dados.
 * @param {{cnaes?:string[], uf?:string, city?:string, limit?:number}} opts
 */
async function listByCnae(opts = {}) {
  const { cnaes = ["4511101", "4511102"], uf, city, limit = 50 } = opts;
  const body = {
    query: {
      termo: [],
      atividade_principal: cnaes,
      natureza_juridica: [],
      uf: uf ? [uf.toUpperCase()] : [],
      municipio: city ? [city] : [],
      situacao_cadastral: "ATIVA",
    },
    range_query: {},
    extras: { somente_mei: false, excluir_mei: false, com_email: true, incluir_atividade_secundaria: false },
    page: 1,
  };

  const leads = [];
  for (let page = 1; leads.length < limit; page++) {
    body.page = page;
    let json;
    try {
      const res = await fetch(CASA_DOS_DADOS, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": UA },
        body: JSON.stringify(body),
      });
      if (!res.ok) break;
      json = await res.json();
    } catch {
      break;
    }
    const items = json?.data?.cnpj || json?.cnpj || [];
    if (!items.length) break;
    for (const it of items) {
      leads.push(mapCasaItem(it, city));
      if (leads.length >= limit) break;
    }
    const totalPages = json?.data?.count ? Math.ceil(json.data.count / 20) : page;
    if (page >= totalPages) break;
  }
  return leads;
}

/** Enriquece um CNPJ via BrasilAPI. Retorna campos úteis ou null. */
async function enrichByCnpj(cnpj) {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) return null;
  try {
    const res = await fetch(BRASILAPI + digits, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const d = await res.json();
    const ddd = d.ddd_telefone_1 || "";
    const decisor = pickDecisorFromQsa(d.qsa);
    return {
      company: d.nome_fantasia || d.razao_social || "",
      category: d.cnae_fiscal_descricao || "",
      phone: ddd,
      email: d.email || "",
      address: [d.logradouro, d.numero, d.bairro, d.municipio, d.uf].filter(Boolean).join(", "),
      city: d.municipio || "",
      cnpj: digits,
      decisor: decisor.name, // nome do sócio/administrador (Receita)
      decisorRole: decisor.role,
      partners: decisor.partners,
    };
  } catch {
    return null;
  }
}

module.exports = { listByCnae, enrichByCnpj, onlyDigits, pickDecisorFromQsa };
