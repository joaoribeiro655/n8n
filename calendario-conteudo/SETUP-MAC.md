# Instalar e rodar no Mac

Guia passo a passo para rodar o **Calendário de Conteúdo** no seu Mac.

## Atalho: instalador automático

Se você já tem o **Node.js** e o **PostgreSQL** instalados (veja o Passo 1), é só:

1. Abrir a pasta `calendario-conteudo` no Finder.
2. Entrar em `scripts` e dar **2 cliques** em **`setup-mac.command`**.
   - Na primeira vez, o Mac pode pedir para autorizar: clique com o botão direito → **Abrir** → **Abrir**.

Ele instala tudo, cria o banco, popula o exemplo e sobe o app em `http://localhost:3000`.
Login de exemplo: **admin@copa.com / mudar123**.

> Pra parar o app, aperte **Ctrl + C** na janela do Terminal que abrir.
> Pra ligar de novo depois, é só dar 2 cliques no mesmo arquivo (ou rodar `npm run dev`).

---

## Passo a passo manual

### Passo 1 — Instalar o que precisa (uma vez só)

**Node.js** — baixe a versão **LTS** em <https://nodejs.org> e instale (next, next, next).

**PostgreSQL** (o banco) — jeito mais fácil, com interface:
1. Baixe o **Postgres.app** em <https://postgresapp.com>
2. Arraste para **Aplicativos**, abra e clique em **Initialize**.
3. No menu do Postgres.app, clique em **"Configure your $PATH"** (deixa os comandos `psql`/`createdb` disponíveis no Terminal).

> Alternativa por Homebrew: `brew install postgresql@16 && brew services start postgresql@16`

### Passo 2 — Baixar o código

No **Terminal**:

```bash
git clone https://github.com/joaoribeiro655/n8n.git
cd n8n
git checkout claude/calendar-design-automation-ilp31y
cd calendario-conteudo
```

> Sem git? No GitHub, na branch `claude/calendar-design-automation-ilp31y`, clique em **Code → Download ZIP**, descompacte e entre na pasta `calendario-conteudo`.

### Passo 3 — Configurar

```bash
cp .env.example .env
```

Abra o arquivo `.env` (com o TextEdit ou o VS Code) e ajuste:

```bash
DATABASE_URL="postgresql://localhost:5432/calendario"
AUTH_SECRET="cole-aqui-um-texto-aleatorio-longo"
ANTHROPIC_API_KEY="sk-ant-..."   # sua chave da Claude (geração de arte)
```

- Gere o `AUTH_SECRET` com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Pegue a `ANTHROPIC_API_KEY` em <https://console.anthropic.com> → Settings → API Keys.
  (O app abre e funciona sem ela; só a **geração com o Claude** fica desligada até você colar a chave.)

### Passo 4 — Criar o banco e rodar

```bash
createdb calendario      # cria o banco (uma vez)
npm install              # instala as dependências
npm run db:push          # cria as tabelas
npm run db:seed          # cria o cliente de exemplo "Copa" (login admin@copa.com / mudar123)
npm run dev              # sobe o app
```

Abra **<http://localhost:3000>** no navegador.

---

## Dúvidas comuns

**"createdb: command not found"** → o PATH do Postgres não foi configurado. No Postgres.app, clique em
*Configure your $PATH*; ou feche e reabra o Terminal.

**"Can't reach database server"** → o Postgres não está rodando. Abra o Postgres.app (ou
`brew services start postgresql@16`).

**A arte não gera / erro de Claude** → falta a `ANTHROPIC_API_KEY` no `.env`. Cole a chave e
reinicie o app (`Ctrl+C` e `npm run dev` de novo).

**Mudei o `.env` e nada mudou** → pare o app (`Ctrl+C`) e rode `npm run dev` de novo; o `.env`
só é lido quando o app sobe.
