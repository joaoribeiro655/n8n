# Meta Ad Escalation Agent

Agente que pesquisa a **Meta Ad Library** (Biblioteca de Anúncios do Facebook/Instagram) e identifica anúncios **escalados** — os "vencedores" que os anunciantes mantêm rodando com alto investimento.

## Como ele decide que um anúncio está escalado

O score final (0–100) combina quatro sinais:

| Sinal | Por quê | Peso |
|---|---|---|
| ⏱ **Tempo no ar** | Anunciante só mantém no ar o que dá lucro. 90+ dias = escala máxima. | 50% (heurística) |
| 🔁 **Nº de variações** | Muitas versões do mesmo tema = teste em escala. | 30% (heurística) |
| 📱 **Posicionamentos** | Rodar em FB + IG + Reels + Audience Network ao mesmo tempo. | 20% (heurística) |
| 🤖 **Análise do criativo por IA** | Claude avalia oferta, ângulo e "cara" de resposta direta. | 40% do score final quando `--ai` |

Sem `--ai`, o score final é 100% heurístico. Com `--ai`, é `60% heurística + 40% IA`.

## Fontes de dados (providers)

| Provider | Cobre | Custo | Requer |
|---|---|---|---|
| **`free`** (default) | **Anúncios comerciais do Brasil** e do mundo, por nicho | **Grátis** | Chromium (Playwright) + acesso ao facebook.com |
| `apify` | Igual ao free | Pago (Apify) | `APIFY_TOKEN` |
| `graph` | Só políticos/sociais (global) ou comerciais da UE | Grátis | `META_ACCESS_TOKEN` |
| `mock` | Dados fictícios | — | — |

> Para "pesquisar nichos e pegar anúncios do Brasil **de graça**", use o provider **`free`** (é o default). Ele abre a Biblioteca de Anúncios pública num Chromium headless e lê os dados das respostas internas. A API oficial da Meta **não** expõe anúncios comerciais do BR.

## Instalação

```bash
cd meta-ad-escalation-agent
npm install
npx playwright install chromium   # baixa o Chromium (só na 1ª vez)
cp .env.example .env              # opcional: ANTHROPIC_API_KEY para o --ai
```

> **Importante:** o provider `free` precisa de acesso de rede ao `facebook.com`.
> Rode na sua máquina — não funciona em sandboxes com saída de rede bloqueada.

## Uso rápido

Pesquisar vários nichos no Brasil e ranquear por escala, com análise de IA:

```bash
npm run dev -- --niches "emagrecedor|renda extra|escova progressiva" --ai --min 60
```

Um nicho só, exportando JSON:

```bash
npm run dev -- --terms "suplemento" --countries BR --limit 300 --json > out.json
```

Depurar vendo o navegador abrir (não-headless):

```bash
SCRAPER_HEADLESS=false npm run dev -- --terms "curso online" --limit 50
```

Testar o pipeline sem navegador nem token (dados fictícios):

```bash
npm run dev -- --provider mock --ai
```

Build para produção:

```bash
npm run build
node dist/index.js --provider mock --ai
```

## ⚠️ Por que scraping e não a API oficial

O endpoint oficial `ads_archive` do Graph API só entrega:
- **Anúncios políticos/sociais** (cobertura global), ou
- **Anúncios comerciais apenas da UE** (por força do DSA).

Para **anúncios comerciais do Brasil** (espionar concorrentes por nicho), o catálogo geral **não** é exposto pela API oficial — por isso o provider `free` lê a Biblioteca de Anúncios pública direto no navegador.

O coletor é **plugável** (`AdLibraryProvider`): `free`, `apify`, `graph` e `mock` compartilham a mesma normalização (`src/providers/raw.ts`), então trocar de fonte não muda o resto do pipeline (scoring + IA + relatório).

> A Biblioteca de Anúncios é uma ferramenta pública de transparência. Ainda assim, scraping está sujeito aos Termos da Meta e a mudanças no site — a extração é resiliente (varredura recursiva do JSON), mas pode precisar de ajuste se a Meta mudar a estrutura.

## Arquitetura

```
src/
  types.ts              Modelo de dados normalizado + contratos
  config.ts             Carrega .env
  providers/
    free.ts             Scraping GRATUITO via Playwright (default) — comerciais BR
    apify.ts            Scraping via Apify (pago) — comerciais BR
    graphApi.ts         API oficial (Graph API ads_archive) — político/UE
    mock.ts             Dados fictícios para testar sem navegador
    raw.ts              Normalização compartilhada (unix/ISO, snapshot, cards…)
  scoring/
    escalation.ts       Heurística tempo + variações + posicionamentos
  ai/
    analyze.ts          Análise do criativo por Claude (tool use estruturado)
  agent.ts              Orquestra busca (multi-nicho) → score → IA → ranking
  report.ts             Saída em texto/JSON
  index.ts              CLI
```
