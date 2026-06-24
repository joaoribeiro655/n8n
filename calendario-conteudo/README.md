# Calendário de Conteúdo

Plataforma para **planejar, gerar e aprovar** as artes dos posts de cada cliente
em um único calendário mensal.

- **Calendário mensal** por cliente (multi-cliente / multi-tenant).
- **A arte entra de três formas:**
  - **Automática** — o briefing do post vai para o **Claude Design** (via webhook) e a arte volta pronta.
  - **Upload** — você envia a arte pronta (PNG/JPG/WebP).
  - **URL** — você cola o link de uma arte já hospedada.
- **Ciclo de aprovação com histórico** — cada arte vira uma versão (v1, v2, v3...).
  Aprovar fecha o post; reprovar guarda o feedback que orienta a próxima versão.

> Este é um **projeto independente** — não depende do n8n nem de nenhum outro
> repositório. Tem seu próprio banco, login e deploy.

## Stack

Next.js 15 (App Router) · React 19 · Prisma · PostgreSQL · Tailwind · Vercel Blob.

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
2. Conecte um **Postgres** (Neon/Vercel Postgres) e um **Blob Store** (aba Storage).
3. Defina `AUTH_SECRET` (string longa e aleatória).
4. O `npm run build` já roda `prisma db push` e cria as tabelas no primeiro deploy.

## Automação com o Claude Design (geração automática)

A geração automática é acionada por um **webhook**. Configure:

```
CLAUDE_DESIGN_WEBHOOK_URL=https://seu-fluxo/webhook/claude-design
CLAUDE_DESIGN_WEBHOOK_TOKEN=opcional
```

Quando o usuário clica em **"Gerar arte automática"** (ou um fluxo agendado chama
`POST /api/posts/:id/generate`), a plataforma faz um `POST` no webhook com o
briefing do post:

```jsonc
// Requisição enviada ao webhook
{
  "clientName": "Copa",
  "clientSlug": "copa",
  "title": "Lançamento",
  "copy": "Legenda do post...",
  "briefing": "O que a arte deve mostrar, estilo, elementos...",
  "date": "2026-06-24T12:00:00.000Z",
  "feedback": "Texto do feedback, se for uma regeração (v2, v3...)",
  "brand": { "primaryColor": "#0ea5e9", "logoUrl": null, "tagline": null }
}
```

O webhook (ex.: um fluxo do n8n que aciona o Claude Design) deve responder com a
URL da arte gerada:

```json
{ "imageUrl": "https://.../arte.png", "note": "opcional" }
```

A imagem entra automaticamente como a próxima versão do post, pronta para
aprovação. **Enquanto o webhook não estiver configurado**, a interface usa
apenas o envio manual (upload/URL) — nada quebra.

## Transformar esta pasta num repositório próprio

Esta pasta já vem pronta para virar um repositório independente:

```bash
cd calendario-conteudo
git init
git add .
git commit -m "chore: calendário de conteúdo (projeto inicial)"
git branch -M main
git remote add origin git@github.com:SEU_USUARIO/calendario-conteudo.git
git push -u origin main
```

Depois é só apontar a Vercel para esse novo repositório.
