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
| **LinkedIn** | Busca **assistida** de decisores (abre a busca pronta) | Manual, mas estável |

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

## Rodar (modo simples)

1. Baixe/abra esta pasta no Finder.
2. Dê **dois cliques em `abrir.command`**.
   - Na primeira vez ele instala o app (demora um pouco) e depois abre a janela.
   - Se o macOS bloquear, clique com o botão direito → **Abrir** → **Abrir**.

> Quer rodar pelo terminal? `npm install` e depois `npm start`.

## Gerar o app com ícone (.app / .dmg)

Para ter um aplicativo de verdade no Launchpad, com o ícone 🎯:

```bash
npm install
npm run dist
```

O app sai em `dist/` (`Gerador de Leads.app` e um `.dmg`). Arraste o `.app`
para a pasta **Aplicativos**.

## Como usar a tela

1. **Cidades** — uma por linha (ex.: Curitiba, Londrina…).
2. **Tipo de negócio** — ex.: `concessionária`, `revenda de carros`, `seminovos`.
3. **Fontes** — marque Google Maps, Sites, CNPJ e/ou LinkedIn.
4. **Limite por cidade** — quantos lugares puxar de cada cidade.
5. **Gerar lista** — acompanhe o progresso embaixo.
6. **Baixar CSV** — escolhe onde salvar.

Nas linhas: o nome da empresa abre no Google Maps, o site/decisor abrem no
navegador.

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
    linkedin.js        # busca assistida de decisores
renderer/              # a tela (HTML/CSS/JS)
build/
  make-icon.mjs        # gera o ícone 🎯 (build/icon.png)
abrir.command          # atalho de dois cliques no Mac
```

## Manutenção

Se o Google Maps parar de trazer resultados, normalmente é só atualizar os
seletores em `src/sources/googleMaps.js` (constante `SEL`).
