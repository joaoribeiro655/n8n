# Deploy — colocar o Moldura.AI num subdomínio (ex.: `molduras.seudominio.com`)

O app é um **servidor Next.js** (não é site estático/PHP), então ele precisa de um
host que rode **Node.js**. O seu domínio na Hostinger entra como **DNS**: você cria
um subdomínio e aponta para onde o app está rodando.

Você tem dois caminhos. O **A** é o mais fácil. O **B** usa um VPS (mais controle).

---

## Antes de tudo: variáveis de ambiente de produção

| Variável | Valor |
|---|---|
| `AUTH_SECRET` | um segredo longo e aleatório. Gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SUPER_ADMIN_EMAIL` | **seu** e-mail. Ao fazer login com ele, você vira **super-admin** automaticamente e aparece a aba ★ Admin. |
| `DATABASE_URL` | `file:/app/data/prod.db` (Docker) ou o que o host pedir |

> Para virar admin: crie sua conta normal em `/register`, depois faça login com o
> e-mail que está em `SUPER_ADMIN_EMAIL`. (Ou rode `npm run admin:promote -- seu@email.com`.)

---

## Caminho A — Railway ou Render (recomendado, ~10 min)

São hosts que rodam Node com **disco persistente** (mantêm o banco SQLite e os
uploads). Mantemos o código como está.

### 1. Subir o código
- Já está no GitHub (branch `claude/multi-tenant-photo-frames-EmpaS`).

### 2. Criar o serviço
- **Railway**: New Project → Deploy from GitHub → selecione o repo → em *Root
  Directory* coloque `moldura-ai`. Railway detecta o Dockerfile.
- **Render**: New → Web Service → conecte o repo → *Root Directory* `moldura-ai`
  → Runtime **Docker**.

### 3. Variáveis de ambiente
Adicione `AUTH_SECRET`, `SUPER_ADMIN_EMAIL` e `DATABASE_URL=file:/app/data/prod.db`.

### 4. Volume persistente (importante!)
Crie um **Volume** montado em `/app/data` (banco) e outro em
`/app/public/uploads` (imagens). Sem isso, os dados somem a cada deploy.

### 5. Domínio
- O host te dá uma URL tipo `moldura-ai-production.up.railway.app`.
- Em *Settings → Domains*, adicione `molduras.seudominio.com`. O host mostra um
  destino **CNAME**.

### 6. DNS na Hostinger
- Painel Hostinger → **Domínios → DNS / Nameservers → Gerenciar registros DNS**.
- Adicione um registro:
  - **Tipo:** CNAME
  - **Nome:** `molduras`
  - **Aponta para:** o destino que o Railway/Render mostrou (ex.: `...up.railway.app`)
  - **TTL:** padrão
- Aguarde a propagação (minutos a algumas horas). HTTPS é automático nesses hosts.

Pronto: `https://molduras.seudominio.com` 🎉

---

## Caminho B — VPS da Hostinger (Docker + Nginx + HTTPS)

Se você tem um **VPS** na Hostinger (ou Contabo/DigitalOcean), roda tudo nele.

### 1. Apontar o subdomínio para o VPS
Hostinger → DNS → novo registro:
- **Tipo:** A · **Nome:** `molduras` · **Aponta para:** o **IP do VPS**

### 2. No servidor (Ubuntu)
```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Clonar o projeto
git clone <URL_DO_SEU_REPO> && cd n8n/moldura-ai

# Criar o .env de produção
cat > .env <<'EOF'
AUTH_SECRET=COLOQUE_UM_SEGREDO_LONGO_AQUI
SUPER_ADMIN_EMAIL=seu-email@dominio.com
EOF

# Subir
docker compose up -d --build
```
O app fica em `http://IP_DO_VPS:3000`.

### 3. Nginx + HTTPS (Let's Encrypt)
```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/molduras <<'EOF'
server {
  server_name molduras.seudominio.com;
  client_max_body_size 20M;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

sudo ln -s /etc/nginx/sites-available/molduras /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d molduras.seudominio.com   # gera o HTTPS
```

Pronto: `https://molduras.seudominio.com` 🎉

Atualizar depois: `git pull && docker compose up -d --build`

---

## Multi-tenant por subdomínio (opcional, fase 2)

Hoje cada concessionária é um tenant **dentro do mesmo endereço** (login separa
os dados). Se mais pra frente você quiser `loja1.molduras.seudominio.com` e
`loja2.molduras.seudominio.com`, dá pra fazer com um *wildcard* DNS
(`*.molduras`) + middleware lendo o subdomínio. Me avise que eu implemento.

---

## SQLite vs Postgres

O padrão é **SQLite** (1 arquivo, simples, ótimo pra começar e aguenta muitas
lojas). Se um dia quiser Postgres (Neon, Supabase, etc.), troque no
`prisma/schema.prisma` o `provider` para `postgresql` e ajuste a `DATABASE_URL`.
Necessário se for pra **Vercel** (lá o disco é efêmero).
