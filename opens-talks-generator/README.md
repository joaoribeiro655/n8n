# Opens Talks Generator

Gerador de **lives** para a **Opens** (plataforma B2B de atendimento omnichannel). Gera **temas** ancorados no **contexto atual** (notícias, tecnologia, sociedade) para a série fixa *Opens Talks* e, a partir de um tema, monta o **plano completo da live** (agenda, copies, CTA, **3 posts de aquecimento**, hashtags) — tudo via **Claude API** (`claude-sonnet-4-6`).

## Stack

- **Front:** React + Vite + Tailwind CSS (tema escuro)
- **Back:** proxy Express fino que guarda a `ANTHROPIC_API_KEY` — a chave **nunca** é exposta ao browser
- **IA:** Anthropic Messages API, modelo `claude-sonnet-4-6`

## Como a API key fica protegida

O browser fala apenas com `/api/messages` (proxy Express em `server/index.js`). É o servidor que injeta a `ANTHROPIC_API_KEY` e chama a Anthropic. O front monta o `system` + `messages` e envia em cada requisição (a API não tem memória). O modelo é fixado no servidor — o cliente não pode trocá-lo.

## Setup

```bash
cd opens-talks-generator
npm install
cp .env.example .env      # preencha ANTHROPIC_API_KEY
```

## Rodar em desenvolvimento

```bash
npm run dev
```

Isso sobe **dois processos** via `concurrently`:

- **proxy Express** em `http://localhost:8787`
- **Vite** em `http://localhost:5173` (faz proxy de `/api` → 8787)

Abra `http://localhost:5173`.

> Rodando separado: `npm run dev:server` e, em outro terminal, `npm run dev:web`.

## Produção

```bash
npm run build     # gera dist/
npm start         # Express serve a API + os estáticos de dist/ na PORT (padrão 8787)
```

## Telas

1. **Gerador de Temas** — escolha vertical, objetivo, nível de funil e quantidade (3–8). Com a opção **"Basear em notícias e tendências atuais"** ligada (padrão), o servidor ativa a **busca na web** da Anthropic para o modelo ancorar cada tema em algo que está em pauta agora (cada card mostra o gancho de atualidade). Cada tema tem botão **Montar episódio**.
2. **Criador de Episódio** — gera o plano completo da live em JSON: agenda, promessa, CTA, copies (landing/e-mail/LinkedIn), **3 posts de aquecimento** (sequência pré-live) e hashtags. Tem **Copiar tudo** e **Exportar Markdown**.

## Busca na web (contexto atual)

A busca roda **server-side** na infraestrutura da Anthropic (ferramenta `web_search_20260209`) — não depende da rede do app. O proxy trata `pause_turn` (continuação do loop de ferramentas). Requer que a busca na web esteja habilitada para a sua org/API key. Se preferir gerar sem web (mais rápido), desligue o toggle na Tela 1.

## Identidade visual

As cores da marca estão como variáveis CSS no topo de `src/index.css` (`--opens-accent`, `--opens-accent-2`, etc.). Troque pelos valores exatos do brand da Opens — todas as telas seguem essas variáveis.

## Notas técnicas

- Toda chamada instrui a API a responder **somente em JSON válido**; o parse é seguro (`try/catch` + limpeza de cercas markdown) em `src/lib/api.js`.
- Estado apenas em `useState` (sem `localStorage`).
- Sem `<form>` — interações via `onClick`/`onChange`.
- Loading e erros tratados em cada geração.
