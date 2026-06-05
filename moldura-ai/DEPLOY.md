# 🚀 Guia para colocar a plataforma no ar (passo a passo para iniciantes)

Você **não precisa saber programar**. É só seguir os cliques abaixo na ordem.
Vamos em 2 partes:

- **Parte 1** — deixar a plataforma funcionando num endereço grátis (`...vercel.app`)
- **Parte 2** — ligar no seu domínio da Hostinger (`molduras.seudominio.com`)

Tudo aqui é **gratuito** para começar.

---

## Parte 1 — Colocar no ar (Vercel)

### Passo 1 — Entrar na Vercel
1. Acesse **https://vercel.com**
2. Clique em **Sign Up** (ou **Log In**) e escolha **Continue with GitHub**
   (use a mesma conta do GitHub onde está o código).
3. Autorize o acesso quando ele pedir.

### Passo 2 — Importar o projeto
1. No painel da Vercel, clique em **Add New… → Project**.
2. Encontre o repositório **`n8n`** (joaoribeiro655/n8n) e clique em **Import**.
3. Vai aparecer uma tela de configuração. Ache o campo **Root Directory**,
   clique em **Edit** e selecione/escreva: **`moldura-ai`**  ← (muito importante!)
4. **Ainda NÃO clique em Deploy.** Antes vamos ligar o banco de dados e o
   guardador de imagens (próximos passos).

> ⚠️ **Importante — a "versão" certa do código (branch):** o código novo está
> num "ramo" chamado **`claude/multi-tenant-photo-frames-EmpaS`** (e não no
> principal). Depois de importar, vá em **Settings → Git → Production Branch**,
> selecione **`claude/multi-tenant-photo-frames-EmpaS`** e salve. Sem isso, a
> Vercel não acha a plataforma. (Se na hora de importar já aparecer a opção de
> escolher o branch, escolha esse.)

### Passo 3 — Criar o banco de dados (gratuito)
1. Na mesma tela do projeto (ou no menu **Storage** depois de criado), clique
   em **Storage → Create Database**.
2. Escolha **Postgres** (Neon). Dê um nome qualquer (ex.: `molduras-db`) e
   confirme. Pode escolher a região mais perto do Brasil (ex.: `São Paulo`).
3. Quando criar, clique em **Connect** e ligue ao seu projeto.
   > Isso preenche **sozinho** a variável `DATABASE_URL`. Você não copia nada. ✅

### Passo 4 — Criar o guardador de imagens (gratuito)
1. Ainda em **Storage → Create Database**, escolha **Blob**.
2. Dê um nome (ex.: `molduras-fotos`) e confirme. Ligue ao projeto.
   > Isso preenche **sozinho** a variável `BLOB_READ_WRITE_TOKEN`. ✅

### Passo 5 — Colocar 2 senhas/configurações
Vá em **Settings → Environment Variables** do projeto e adicione duas:

| Name (nome) | Value (valor) |
|---|---|
| `AUTH_SECRET` | um texto longo e aleatório. Pode inventar uns 40 caracteres misturando letras e números, ex.: `mEu-Segredo-Sup3r-Long0-9f8a7b6c5d4e3f2g1h` |
| `SUPER_ADMIN_EMAIL` | **seu e-mail** (o que você vai usar pra logar como dono da plataforma) |

Clique em **Save** em cada uma.

### Passo 6 — Publicar
1. Clique em **Deploy** (ou **Redeploy** se já tiver criado).
2. Espere 1–3 minutinhos. Quando aparecer **🎉 Congratulations**, clique em
   **Visit** / **Continue to Dashboard** para ver o endereço, algo como
   `https://moldura-ai.vercel.app`.

### Passo 7 — Criar sua conta de dono
1. Abra o endereço e clique em **Criar conta**.
2. Cadastre usando **o mesmo e-mail** que você colocou em `SUPER_ADMIN_EMAIL`.
3. **Saia e entre de novo** (login). Pronto: vai aparecer o botão
   **★ Admin da plataforma** no menu — é a sua área de dono, onde você cria e
   gerencia todas as concessionárias. 🎉

> A plataforma já está funcionando! Você pode testar tudo agora.

---

## Parte 2 — Ligar no seu domínio da Hostinger

Quando estiver feliz com o resultado, conecte um subdomínio
(ex.: `molduras.seudominio.com`).

### Passo 1 — Adicionar o domínio na Vercel
1. No projeto, vá em **Settings → Domains**.
2. Digite `molduras.seudominio.com` (troque pelo seu) e clique em **Add**.
3. A Vercel vai mostrar uma instrução de DNS. Geralmente um registro **CNAME**
   apontando para **`cname.vercel-dns.com`**. Deixe essa tela aberta.

### Passo 2 — Apontar na Hostinger
1. Entre no **hPanel** da Hostinger.
2. Vá em **Domínios → (seu domínio) → DNS / Nameservers → Gerenciar registros DNS**.
3. Clique em **Adicionar registro** e preencha:
   - **Tipo:** `CNAME`
   - **Nome / Host:** `molduras`  *(só essa palavra, sem o resto)*
   - **Aponta para / Destino / Valor:** `cname.vercel-dns.com`
     *(use exatamente o que a Vercel mostrou)*
   - **TTL:** deixe o padrão
4. Salve.

### Passo 3 — Esperar
- Pode levar de alguns minutos até algumas horas pra "propagar".
- Na Vercel, a bolinha do domínio fica **verde** quando estiver pronto.
- O **HTTPS (cadeado)** é automático.

Pronto: **https://molduras.seudominio.com** funcionando! 🎉🎉

---

## Dúvidas comuns

**Vai custar quanto?** Pra começar, R$ 0. Vercel, Postgres (Neon) e Blob têm
plano gratuito generoso. Só paga se crescer bastante o uso.

**Mexi no código, como atualizo o site?** Toda vez que o código for atualizado
no GitHub (eu faço isso), a Vercel **republica sozinha**. Você não faz nada.

**Esqueci de ser admin / não apareceu o botão Admin.** Confirme que o e-mail da
sua conta é **igual** ao `SUPER_ADMIN_EMAIL` nas variáveis, e faça **logout +
login** de novo.

**Deu erro no Deploy.** Quase sempre é o **Root Directory** que não está como
`moldura-ai`, ou faltou ligar o **Postgres**. Me chame que eu te ajudo a ler a
mensagem de erro.
