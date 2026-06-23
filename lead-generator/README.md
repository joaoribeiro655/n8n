# Lead Generator — listas para disparos frios (estilo Apollo)

Ferramenta de linha de comando que **gera listas de prospecção (cold outreach)**
buscando contatos do seu **ICP** na base do [Apollo.io](https://apollo.io),
enriquecendo os e-mails (opcional) e exportando tudo num **CSV pronto pra disparo**.

Pensada para prospectar clientes do **Moldura.AI** (ex.: donos e gerentes de
concessionárias), mas funciona para qualquer ICP.

## O que ela faz

1. Lê um arquivo de **ICP** (`icp.json`) com cargo, setor, tamanho e localização.
2. Busca pessoas no Apollo (paginado, com deduplicação).
3. (Opcional) **Enriquece** para revelar os e-mails — isso consome créditos do Apollo.
4. Exporta um **CSV** com nome, cargo, e-mail, LinkedIn, empresa, telefone etc.

> ⚠️ A busca do Apollo **não retorna e-mails reais**. Para tê-los no CSV, use
> `--enrich` (gasta 1 crédito por contato encontrado).

## Pré-requisitos

- Node.js 18+ (testado no 22).
- Uma **chave de API do Apollo** (plano com acesso à API):
  Apollo → *Settings* → *Integrations* → *API* → *Create new key*.

## Configuração

```bash
cd lead-generator
npm install                 # instala o tsx (executor de TypeScript)
cp .env.example .env        # cole sua APOLLO_API_KEY
cp icp.example.json icp.json # ajuste o seu ICP
```

## Como usar

```bash
# 1) Ver o tamanho do mercado para o ICP, sem gastar nada:
npx tsx src/index.ts --icp icp.json --dry-run

# 2) Gerar 300 leads (sem e-mail, sem créditos):
npx tsx src/index.ts --icp icp.json --limit 300 -o concessionarias.csv

# 3) Gerar 100 leads JÁ com e-mails verificados (gasta créditos):
npx tsx src/index.ts --icp icp.json --limit 100 --enrich
```

Ajuda completa: `npx tsx src/index.ts --help`

### Opções

| Opção | Descrição |
|---|---|
| `-i, --icp <arquivo>` | Arquivo JSON com o ICP (padrão: `icp.json`) |
| `-l, --limit <n>` | Total de leads (padrão: 100) |
| `--per-page <n>` | Resultados por página, máx 100 |
| `-e, --enrich` | Revela e-mails — **consome créditos** (1 por match) |
| `--reveal-personal` | Ao enriquecer, traz também e-mails pessoais |
| `-o, --output <arquivo>` | CSV de saída (padrão: `leads-<data>.csv`) |
| `--dry-run` | Só mostra quantos leads existem (não baixa, não gasta) |

## O arquivo de ICP

Todos os campos são opcionais — quanto mais preenchido, mais qualificada a lista:

```json
{
  "titles": ["dono", "gerente comercial"],
  "seniorities": ["owner", "director", "manager"],
  "personLocations": ["Brazil"],
  "companyLocations": ["Brazil"],
  "industryKeywords": ["car dealership", "automotive"],
  "companySizes": ["1,10", "11,50", "51,200"],
  "emailStatus": ["verified", "likely to engage"]
}
```

| Campo | Mapeia para (Apollo) |
|---|---|
| `titles` | `person_titles` |
| `seniorities` | `person_seniorities` (`owner`, `founder`, `c_suite`, `vp`, `head`, `director`, `manager`, `senior`, `entry`, `intern`) |
| `personLocations` | `person_locations` |
| `companyLocations` | `organization_locations` |
| `industryKeywords` | `q_organization_keyword_tags` |
| `companySizes` | `organization_num_employees_ranges` (faixas como `"11,50"`) |
| `companyDomains` | `q_organization_domains_list` |
| `keywords` | `q_keywords` (busca livre) |
| `emailStatus` | `contact_email_status` |

## Saída (CSV)

Colunas: `nome, primeiro_nome, sobrenome, cargo, senioridade, email, status_email,
linkedin, localizacao_pessoa, empresa, dominio, site, setor, tamanho_empresa,
localizacao_empresa, telefone_empresa`.

UTF-8 com BOM (acentos abrem certo no Excel e no Google Sheets). Os CSVs gerados
ficam fora do git (veja `.gitignore`).

## Boas práticas de cold outreach

- **LGPD/consentimento:** use os dados para abordagem B2B legítima e ofereça
  opt-out. Não compartilhe nem revenda a lista.
- Comece com `--dry-run` para calibrar o ICP antes de gastar créditos.
- Enriqueça em lotes pequenos e priorize `emailStatus: ["verified"]`.
