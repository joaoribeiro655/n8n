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

| Provider | Cobre | Requer | Uso |
|---|---|---|---|
| **`apify`** (default) | **Anúncios comerciais do Brasil** e do mundo, por nicho | `APIFY_TOKEN` | Pesquisar nichos e espionar concorrentes no BR |
| `graph` | Só anúncios políticos/sociais (global) ou comerciais da UE | `META_ACCESS_TOKEN` | Transparência política |
| `mock` | Dados fictícios | — | Testar o pipeline |

> Para o caso "pesquisar nichos e pegar anúncios do Brasil", use o provider **`apify`** (é o default). A API oficial da Meta **não** expõe anúncios comerciais do BR.

## Instalação

```bash
cd meta-ad-escalation-agent
npm install
cp .env.example .env   # preencha APIFY_TOKEN e (opcional) ANTHROPIC_API_KEY
```

## Uso rápido

Pesquisar vários nichos no Brasil e ranquear por escala, com análise de IA:

```bash
npm run dev -- --niches "emagrecedor|renda extra|escova progressiva" --ai --min 60
```

Um nicho só, exportando JSON:

```bash
npm run dev -- --terms "suplemento" --countries BR --limit 300 --json > out.json
```

Testar o pipeline sem nenhum token (dados fictícios):

```bash
npm run dev -- --provider mock --ai
```

Build para produção:

```bash
npm run build
node dist/index.js --provider mock --ai
```

## ⚠️ Por que Apify e não a API oficial

O endpoint oficial `ads_archive` do Graph API só entrega:
- **Anúncios políticos/sociais** (cobertura global), ou
- **Anúncios comerciais apenas da UE** (por força do DSA).

Para **anúncios comerciais do Brasil** (o caso de espionar concorrentes por nicho), o catálogo geral **não** é exposto pela API oficial — por isso o provider `apify` faz scraping da Biblioteca de Anúncios pública.

O coletor é **plugável** (`AdLibraryProvider`): dá para trocar o actor do Apify (`APIFY_ACTOR_ID`) ou escrever outro provider seguindo a mesma interface em `src/providers/` sem mexer no resto do pipeline (scoring + IA + relatório).

## Arquitetura

```
src/
  types.ts              Modelo de dados normalizado + contratos
  config.ts             Carrega .env
  providers/
    apify.ts            Provider de scraping (Apify) — anúncios comerciais BR
    graphApi.ts         Provider oficial (Graph API ads_archive) — político/UE
    mock.ts             Dados fictícios para testar sem token
  scoring/
    escalation.ts       Heurística tempo + variações + posicionamentos
  ai/
    analyze.ts          Análise do criativo por Claude (tool use estruturado)
  agent.ts              Orquestra busca (multi-nicho) → score → IA → ranking
  report.ts             Saída em texto/JSON
  index.ts              CLI
```

## Configurar o Apify

1. Crie uma conta em <https://apify.com>.
2. Copie o token em <https://console.apify.com/account/integrations> → `APIFY_TOKEN`.
3. O actor default é `curious_coder/facebook-ads-library-scraper`. Se preferir outro actor equivalente da Ad Library, defina `APIFY_ACTOR_ID` (formato `usuario~actor`). A normalização em `src/providers/apify.ts` é defensiva e cobre variações de formato entre actors.
