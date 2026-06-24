# Calendário de Conteúdo

Plataforma para **planejar, gerar e aprovar** as artes dos posts de cada cliente
em um único calendário mensal — **tudo dentro da própria plataforma**, sem
serviços externos.

- **Calendário mensal** por cliente (multi-cliente / multi-tenant).
- **A arte é criada pelo Claude Design**: o **Claude** (`claude-opus-4-8`) gera o
  design de cada post — um HTML/CSS sob medida, na identidade da marca (brand
  guide). Esse design é **exportado para PNG no navegador** (`html-to-image`).
  Funciona inclusive no robô diário. (Também dá para **enviar uma arte pronta**.)
- **Galeria** com as artes aprovadas, download individual e **download do mês
  inteiro em .zip** — esse é o destino final (no lugar do Google Drive).
- **Ciclo de aprovação com histórico** — cada arte vira uma versão (v1, v2, v3...).
  Reprovar abre o campo de notas e **gera a próxima versão na hora** com os ajustes.

## Fluxo automático (a operação no dia a dia)

1. **Cadastra a empresa** e preenche o **brand guide** (aba Marca).
2. **5 dias antes de virar o mês**, o painel mostra um **alerta** para gerar o
   calendário do próximo mês daquela empresa.
3. Você **monta o calendário**: cria os posts com data + copy + briefing (+ foto
   de fundo opcional).
4. **Todo dia, 1 dia antes** (Vercel Cron → `/api/cron/daily`), o robô pede ao
   **Claude Design** a arte dos posts do dia seguinte. O design fica aguardando revisão.
5. Na plataforma você abre o post, vê o design do Claude e **Aprova + exporta o
   PNG**, ou **Reprova** → escreve as notas → o Claude **refaz** com os ajustes.
6. As aprovadas ficam na **Galeria**, prontas para baixar (individual ou .zip).

> **Requer `ANTHROPIC_API_KEY`** (o Claude Design). Gere em
> [console.anthropic.com](https://console.anthropic.com) e configure no projeto.

## Stack

Next.js 15 (App Router) · React 19 · Prisma · PostgreSQL · Tailwind ·
Anthropic SDK (Claude Design) · `html-to-image` (export PNG) · Vercel Blob · JSZip.

## Rodando localmente

```bash
npm install
cp .env.example .env      # ajuste DATABASE_URL e AUTH_SECRET
npm run db:push           # cria as tabelas
npm run db:seed           # cria o cliente demo "Copa" + login admin@copa.com / mudar123
npm run dev               # http://localhost:3000
```

## Deploy na Vercel

1. Crie um projeto novo na Vercel apontando para este repositório.
2. Conecte um **Postgres** (Neon/Vercel Postgres) e um **Blob Store** (Storage).
3. Defina `AUTH_SECRET` (string longa e aleatória) e `CRON_SECRET`.
4. O `npm run build` já roda `prisma db push` e cria as tabelas no primeiro deploy.
5. O `vercel.json` já agenda o robô diário (`/api/cron/daily`, 09:00 UTC).

Para testar o robô manualmente:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://SEU_APP/api/cron/daily
```

## Transformar esta pasta num repositório próprio

```bash
cd calendario-conteudo
git init && git add . && git commit -m "calendário de conteúdo (inicial)"
git branch -M main
git remote add origin git@github.com:SEU_USUARIO/calendario-conteudo.git
git push -u origin main
```

Depois é só apontar a Vercel para esse novo repositório.
