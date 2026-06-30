# Gerador de Leads 🎯

App de **desktop (macOS)** para montar listas de prospecção (cold outreach)
**raspando fontes públicas — sem chaves pagas**. Pensado para prospectar
concessionárias (clientes do Moldura.AI), mas serve para qualquer nicho local.

Você clica no ícone → abre uma tela → escolhe cidade, tipo de negócio e fontes →
o app coleta e você **baixa um CSV pronto pra disparar**.

## Fontes (todas grátis)

| Fonte | O que traz | Confiabilidade |
|---|---|---|
| **Google Maps** | Empresa, telefone, site, endereço, nota/avaliações | Alta (fonte principal) |
| **Sites** | E-mail e WhatsApp extraídos do site da empresa | Média (depende do site) |
| **CNPJ / Receita** | Razão social, CNPJ, telefone, e-mail (Casa dos Dados + BrasilAPI) | Média |
| **LinkedIn (híbrido)** | Nome, cargo e perfil do decisor — achados via busca web, **sem login** | Média, **sem risco de banir conta** |

> 🔎 **Como funciona o Google Maps sem chave:** o app é feito em Electron (um
> Chromium), então ele abre o Maps numa janela invisível e lê os resultados —
> de graça. Como o Google muda o layout às vezes, os seletores ficam isolados em
> `src/sources/googleMaps.js` para facilitar o conserto.
>
> ⚖️ **Uso consciente:** raspagem pode contrariar os termos de alguns serviços e
> os dados são pessoais (LGPD). Use para prospecção B2B legítima, com moderação
> (evite volumes enormes) e ofereça opt-out nos disparos.

## Pré-requisitos

- macOS
- [Node.js LTS](https://nodejs.org) instalado

## Rodar (modo simples) — e ele se atualiza sozinho

1. Baixe/abra esta pasta no Finder.
2. Dê **dois cliques em `abrir.command`**.
   - Na primeira vez ele instala o app (demora um pouco) e depois abre a janela.
   - Se o macOS bloquear, clique com o botão direito → **Abrir** → **Abrir**.

> 🔄 **Atualização automática:** toda vez que você abre pelo `abrir.command`, ele
> busca sozinho a versão mais nova no GitHub antes de abrir. Você não precisa
> rodar nenhum comando para atualizar — é só abrir. (Funciona quando a pasta veio
> do GitHub via `git`. Sem internet, ele simplesmente abre a versão atual.)

> Quer rodar pelo terminal? `npm install` e depois `npm start`.

## Gerar o app com ícone (.app / .dmg)

Para ter um aplicativo de verdade no Launchpad, com o ícone 🎯:

```bash
npm install
npm run dist
```

O app sai em `dist/` (`Gerador de Leads.app` e um `.dmg`). Arraste o `.app`
para a pasta **Aplicativos**.

> ⚠️ O `.app` empacotado **não** se atualiza sozinho (é uma cópia "congelada").
> Para ter sempre a versão mais nova sem esforço, use o `abrir.command` — ele
> atualiza a cada vez que abre. Se preferir o `.app`, refaça `npm run dist` quando
> quiser atualizar.

## Como usar a tela

1. **Cidades** — uma por linha (ex.: Curitiba, Londrina…).
2. **Tipo de negócio** — ex.: `concessionária`, `revenda de carros`, `seminovos`.
3. **Fontes** — marque Google Maps, Sites, CNPJ e/ou LinkedIn.
4. **Limite por cidade** — quantos lugares puxar de cada cidade.
5. **Gerar lista** — acompanhe o progresso embaixo.
6. **Baixar CSV** — escolhe onde salvar.

Nas linhas: o nome da empresa abre no Google Maps, o site/decisor abrem no
navegador.

## Disparar no WhatsApp (aba 2) — API não oficial

A aba **"Disparar WhatsApp"** conecta o seu WhatsApp por **QR code** (igual ao
WhatsApp Web, via Baileys) e envia as mensagens para os leads coletados.

**Como usar:**
1. Colete os leads na aba 1 (precisam ter telefone/WhatsApp).
2. Na aba 2, clique **Conectar WhatsApp** e escaneie o QR
   (WhatsApp do celular → *Aparelhos conectados* → *Conectar aparelho*).
3. Escreva a mensagem usando variáveis: `{empresa}`, `{nome}`, `{cidade}`, `{cargo}`.
4. Ajuste o **ritmo** (intervalo entre mensagens) e o **limite por sessão**.
5. Clique **Enviar para a lista**. Dá para **Parar** a qualquer momento.

**Proteções embutidas:** confere se o número tem WhatsApp, intervalos aleatórios,
limite por sessão e não reenvia para quem já recebeu.

> 🚨 **LEIA:** automação não oficial **viola os Termos do WhatsApp** e disparo
> frio em massa tem **alto risco de BANIR o número**. Recomendações sérias:
> - use um **número secundário/dedicado**, nunca o principal do negócio;
> - **aqueça** o chip (uso normal por alguns dias antes);
> - volume **baixo** (dezenas/dia, não centenas), intervalos longos;
> - mensagem **personalizada** e com opção de **opt-out** ("responda SAIR");
> - respeite a **LGPD** (base legal para contato B2B, atender pedidos de remoção).
>
> O app dá as ferramentas de moderação, mas o risco de bloqueio é inerente ao
> método. Use com responsabilidade.

## Estrutura

```
src/
  main.js              # processo principal (orquestra fontes, IPC, salvar CSV)
  preload.js           # ponte segura para a tela
  csv.js               # gera o CSV (UTF-8 + BOM)
  store.js             # config local
  sources/
    googleMaps.js      # raspagem via Chromium do Electron
    website.js         # e-mail/WhatsApp/Instagram do site (fetch + regex)
    cnpj.js            # Casa dos Dados (lista) + BrasilAPI (enriquece)
    linkedin.js        # acha decisores via busca web (DuckDuckGo), sem login
    websearch.js       # busca na web pelo Chromium do Electron (sem bloqueio)
    email.js           # adivinha o e-mail provável do decisor (+ checagem MX)
    whatsapp.js        # disparo via API não oficial (Baileys + QR)
renderer/              # a tela (HTML/CSS/JS)
build/
  make-icon.mjs        # gera o ícone 🎯 (build/icon.png)
abrir.command          # atalho de dois cliques no Mac
```

## Manutenção

Se o Google Maps parar de trazer resultados, normalmente é só atualizar os
seletores em `src/sources/googleMaps.js` (constante `SEL`).
