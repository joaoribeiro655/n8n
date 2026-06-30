# Opens Talks Generator

Gerador de **lives** para a **Opens** (plataforma B2B de atendimento omnichannel). Gera **temas** ancorados no **contexto atual** (notícias, tecnologia, sociedade) para a série fixa *Opens Talks* e, a partir de um tema, monta o **plano completo da live** (agenda, copies, CTA, **3 posts de aquecimento**, hashtags) — tudo via **Claude API** (`claude-sonnet-4-6`).

## Stack

- **Front:** React + Vite + Tailwind CSS (tema escuro)
- **Back:** proxy Express fino que guarda a `ANTHROPIC_API_KEY` — a chave **nunca** é exposta ao browser
- **IA:** Anthropic Messages API, modelo `claude-sonnet-4-6`

## Como a API key fica protegida

O browser fala apenas com `/api/messages` (proxy Express em `server/index.js`). É o servidor que injeta a `ANTHROPIC_API_KEY` e chama a Anthropic. O front monta o `system` + `messages` e envia em cada requisição (a API não tem memória). O modelo é fixado no servidor — o cliente não pode trocá-lo.

## Configurar a chave da Anthropic

Há **duas formas** (a chave fica sempre só no servidor, nunca no navegador):

1. **Pela interface (mais fácil, sem mexer em arquivos):** abra o app, clique em **⚙ Configuração** (ou no banner "Configurar agora"), cole a chave `sk-ant-…` e clique em **Salvar chave** — o app já testa a conexão. A chave fica na **memória do servidor** (some ao reiniciar; sem `localStorage`).
2. **Por arquivo `.env`:** copie `cp .env.example .env` e preencha `ANTHROPIC_API_KEY`. Serve de fallback e é o ideal para deploy.

## Setup

```bash
cd opens-talks-generator
npm install
# opcional: cp .env.example .env  (ou configure a chave pela interface depois)
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

## Produção (web)

```bash
npm run build     # gera dist/
npm start         # Express serve a API + os estáticos de dist/ na PORT (padrão 8787)
```

## App de Mac (.app em /Applications)

O app é empacotado com **Electron** — ele embute o Node, então o servidor e a
chamada à Anthropic rodam dentro do `.app`. A chave fica persistida no diretório
de dados do app (`userData/anthropic.key`, modo `600`), no seu Mac.

**O empacotamento para macOS precisa rodar num Mac** (não dá para gerar `.dmg`
no Linux). Em um Mac com Node 18+:

```bash
npm install
npm run dist:mac     # gera release/Opens Talks-<versão>.dmg e o .app
```

Depois é só abrir o `.dmg` e arrastar **Opens Talks** para a pasta Aplicativos.
Como o app não é assinado/notarizado, no primeiro abrir use **clique direito →
Abrir** (ou Ajustes → Privacidade e Segurança → "Abrir mesmo assim").

Rodar o app localmente sem empacotar (para testar): `npm run electron`.

> Para distribuir fora do seu Mac sem o aviso de "desenvolvedor não
> identificado", é preciso uma conta Apple Developer (assinatura + notarização).

## Auto-update (atualizar sozinho ao abrir)

O app usa **electron-updater** + **GitHub Releases**: ao abrir, ele verifica se
há versão mais nova, baixa em segundo plano e oferece **Reiniciar agora**. A
chave e configurações são mantidas.

**Pré-requisitos (uma vez):**

1. **Conta Apple Developer** (US$99/ano). No macOS, o auto-update **exige** o app
   assinado com um certificado **Developer ID Application** — sem isso o macOS
   recusa a atualização. Instale o certificado no Keychain do Mac de build.
2. Releases precisam ser **baixáveis** pelo app. Se o repositório for privado, a
   forma mais simples é publicar as versões num **repositório público dedicado**
   (ex.: `opens-talks-releases`) e apontar `build.publish` para ele. Se o repo for
   público, pode manter como está.
3. Um **GitHub token** com permissão de criar releases, exportado como `GH_TOKEN`.

**Variáveis no Mac de build (assinatura + notarização):**

```bash
export CSC_LINK="/caminho/DeveloperID.p12"   # ou já instalado no Keychain
export CSC_KEY_PASSWORD="senha-do-p12"
export APPLE_ID="seu-apple-id@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # app-specific password
export APPLE_TEAM_ID="SEUTEAMID"
export GH_TOKEN="ghp_..."
```

**Publicar uma nova versão:**

1. Suba o número em `package.json` → `"version"` (ex.: `0.1.0` → `0.1.1`).
   O auto-update só dispara quando a versão publicada é maior que a instalada.
2. Rode: `npm run release:mac` — isso builda, assina, notariza e publica o
   `.dmg`, o `.zip` e o `latest-mac.yml` no GitHub Releases.
3. Os apps instalados pegam a atualização no próximo "abrir".

> Sem a conta Apple, o app continua funcionando normalmente (a parte web/desktop),
> mas o auto-update no macOS fica inativo — aí a atualização é reempacotar e
> reinstalar manualmente.

## Telas

1. **Gerador de Temas** — escolha vertical, objetivo, nível de funil e quantidade (3–8). Com a opção **"Basear em notícias e tendências atuais"** ligada (padrão), o servidor ativa a **busca na web** da Anthropic para o modelo ancorar cada tema em algo que está em pauta agora (cada card mostra o gancho de atualidade). Cada tema tem botão **Montar episódio**.
2. **Criador de Episódio** — gera o plano completo da live em JSON: agenda, promessa, CTA, copies (landing/e-mail/LinkedIn), **3 posts de aquecimento** (sequência pré-live) e hashtags. Tem **Copiar tudo** e **Exportar Markdown**.

## Modos: Opens Talks (mercado) e ELGA (clientes)

No topo há um seletor de modo:

- **Opens Talks · mercado** — o gerador aberto (temas + lives para o mercado).
- **ELGA · clientes** — temas "em alta" para o programa **ELGA** (educacional, só
  para clientes da base), gerados a partir do que os clientes estão de fato
  comentando/relatando no **Growth**.

### Growth (Supabase)

O **Growth** é a plataforma de dados da Opens (backend 100% Supabase: PostgreSQL +
Auth + RLS). O app conecta direto via `supabase-js` com a **anon key pública**
(protegida por RLS) e o seu **login (e-mail/senha)** — você só lê o que sua conta
tem permissão. Clique em **Growth** no topo para entrar. A sessão fica salva
(localStorage) para os próximos usos.

No modo ELGA, o app puxa os **assuntos recorrentes** dos clientes numa janela
recente e os usa como insumo para os temas. O mapeamento de quais tabelas/colunas
representam "assunto/suporte" fica em `src/lib/growth.js` (bloco `CONFIG_INSUMOS`)
— hoje lê `activities` e `whatsapp_template_dispatches`; ajuste ali se o dado vier
de outra tabela. O app mostra de forma transparente o que leu (quantidade por
tabela + chips de assuntos) antes de gerar.

> A anon key é pública por design; **nunca** use a service_role no cliente.

## Busca na web (contexto atual)

A busca roda **server-side** na infraestrutura da Anthropic (ferramenta `web_search_20260209`) — não depende da rede do app. O proxy trata `pause_turn` (continuação do loop de ferramentas). Requer que a busca na web esteja habilitada para a sua org/API key. Se preferir gerar sem web (mais rápido), desligue o toggle na Tela 1.

## Identidade visual

As cores da marca estão como variáveis CSS no topo de `src/index.css` (`--opens-accent`, `--opens-accent-2`, etc.). Troque pelos valores exatos do brand da Opens — todas as telas seguem essas variáveis.

## Notas técnicas

- Toda chamada instrui a API a responder **somente em JSON válido**; o parse é seguro (`try/catch` + limpeza de cercas markdown) em `src/lib/api.js`.
- Estado apenas em `useState` (sem `localStorage`).
- Sem `<form>` — interações via `onClick`/`onChange`.
- Loading e erros tratados em cada geração.
