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

## Instalação

```bash
cd meta-ad-escalation-agent
npm install
cp .env.example .env   # preencha META_ACCESS_TOKEN e (opcional) ANTHROPIC_API_KEY
```

## Uso rápido

Teste o pipeline sem token, com dados fictícios:

```bash
npm run dev -- --provider mock --ai
```

Busca real (requer `META_ACCESS_TOKEN`):

```bash
npm run dev -- --terms "emagrecedor" --countries BR --ai --min 60
npm run dev -- --page-ids 1234567890 --countries BR --json > out.json
```

Build para produção:

```bash
npm run build
node dist/index.js --provider mock --ai
```

## ⚠️ Limitações da API oficial da Meta

O endpoint oficial `ads_archive` do Graph API:

- **Anúncios políticos/sociais** (`--ad-type POLITICAL_AND_ISSUE_ADS`): dados ricos (gasto, impressões), cobertura global.
- **Anúncios comerciais** (`--ad-type ALL`): a API oficial só entrega o catálogo geral para **países da UE** (por força do DSA), com campos limitados. Para BR/US comerciais, o catálogo geral **não** é exposto pela API oficial.

Por isso o coletor é **plugável** (`AdLibraryProvider`). Para cobrir anúncios comerciais fora da UE, implemente um provider de scraping (ex.: Apify "Facebook Ad Library Scraper" ou o endpoint GraphQL interno da Ad Library) seguindo a mesma interface em `src/providers/` — o resto do pipeline (scoring + IA + relatório) não muda.

## Arquitetura

```
src/
  types.ts              Modelo de dados normalizado + contratos
  config.ts             Carrega .env
  providers/
    graphApi.ts         Provider oficial (Graph API ads_archive)
    mock.ts             Dados fictícios para testar sem token
  scoring/
    escalation.ts       Heurística tempo + variações + posicionamentos
  ai/
    analyze.ts          Análise do criativo por Claude (structured outputs)
  agent.ts              Orquestra busca → score → IA → ranking
  report.ts             Saída em texto/JSON
  index.ts              CLI
```

## Token da Meta

1. Crie um app em <https://developers.facebook.com>.
2. Confirme identidade/local (necessário para a Ad Library API).
3. Gere um token no Explorador da Graph API (ou um token de sistema) e coloque em `META_ACCESS_TOKEN`.
