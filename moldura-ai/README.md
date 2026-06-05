# Moldura.AI

Plataforma **multi-tenant** para concessionárias gerarem molduras (artes) de
marketing automaticamente. Cada loja tem sua própria identidade visual; a IA
monta a moldura com o logo, as cores e o contato da loja, e o vendedor só
arrasta a foto do carro para gerar a arte final (Instagram / WhatsApp).

## Funcionalidades (MVP)

- 🔐 **Login / multi-usuário** — cada concessionária (tenant) com seus próprios usuários (dono + vendedores).
- 🎨 **Identidade visual** — logo, cores, fonte, telefone, site e endereço por loja.
- ✦ **Molduras automáticas** — geradas a partir do branding (3 estilos prontos).
- ▢ **Importar molduras** — exporte do Claude Design como PNG e importe.
- 🖼️ **Estúdio** — envie a foto, arraste e dê zoom dentro da moldura, baixe em PNG 1080×1080.
- 📁 **Galeria** — todas as artes salvas pela equipe.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Prisma · PostgreSQL · Vercel Blob · JWT (cookie httpOnly).

## Como rodar

> Para colocar no ar (Vercel + domínio Hostinger) siga o **[DEPLOY.md](./DEPLOY.md)**
> — guia passo a passo para iniciantes.

Para rodar localmente (precisa de um PostgreSQL):

```bash
cd moldura-ai
npm install
cp .env.example .env          # ajuste DATABASE_URL/AUTH_SECRET
npm run db:push               # cria as tabelas no Postgres
npm run db:seed               # (opcional) cria conta demo
npm run dev                   # http://localhost:3000
```

Conta demo (após `db:seed`): **demo@moldura.ai** / **123456**

## Fluxo de uso

1. Crie a conta da concessionária em `/register`.
2. Configure a marca em **Identidade visual**.
3. Em **Molduras**, gere uma automática ou importe a sua.
4. No **Estúdio**, envie a foto do carro, posicione e baixe a arte.

## Estrutura

```
src/
  app/
    api/            # rotas: auth, branding, frames, artworks, team, upload
    dashboard/      # painel (studio, frames, gallery, branding, team)
    login, register # autenticação
  components/       # UI client (editor, formulários, etc.)
  lib/              # auth, prisma, upload, gerador de molduras, utils
prisma/             # schema + seed
public/uploads/     # arquivos enviados (logos, molduras, artes)
```

## Produção (Vercel)

- **Banco:** PostgreSQL (Vercel Postgres/Neon). A `DATABASE_URL` é preenchida
  automaticamente ao conectar o storage no projeto.
- **Imagens:** Vercel Blob. Quando `BLOB_READ_WRITE_TOKEN` existe, os uploads vão
  para a nuvem; sem ele (dev), gravam em `public/uploads`.
- **Sessão:** defina um `AUTH_SECRET` forte.
- **Admin:** o e-mail em `SUPER_ADMIN_EMAIL` vira super-admin ao logar.

Veja o **[DEPLOY.md](./DEPLOY.md)** para o passo a passo completo.
