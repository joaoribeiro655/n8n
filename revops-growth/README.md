# RevOps — Growth da Opens

Script para puxar dados de RevOps do **Opens Growth Hub** (Edge Functions Supabase)
e montar um resumo: pipeline em aberto, win rate, ticket médio, quebra por
etapa/funil/tipo e atividade do time.

## Fonte de dados

API do Growth (Supabase Edge Functions):

- `GET /query-deals` — oportunidades (filtros: `funnel_id`, `stage_id`, `owner_id`,
  `win`, `deal_type`, `search`, `source`)
- `GET /query-activities` — atividades (filtros: `date_from`, `date_to`,
  `activity_type_id`, `category_id`, `client_id`, `contact_id`, `user_id`, `status`)

Base URL padrão: `https://cydbkzvfojvmtxmurxwq.supabase.co/functions/v1`

A API aceita **modo público** (sem auth). Para modo autenticado, defina
`GROWTH_API_KEY` (header `x-api-key`) ou `GROWTH_TOKEN` (header `Authorization: Bearer`).

## ⚠️ Pré-requisito de rede

Este script só funciona se o ambiente conseguir alcançar o host do Supabase.
Em ambientes Claude Code com allowlist de egress, é preciso liberar:

```
cydbkzvfojvmtxmurxwq.supabase.co
```

Sem isso, o script falha com uma mensagem explicando o bloqueio.

## Uso

```bash
# resumo completo (todos os deals + atividades)
node revops-growth/growth-revops.mjs

# atividades de um período
node revops-growth/growth-revops.mjs --from 2026-01-01 --to 2026-03-31

# saída JSON crua (deals + activities + report) para encadear com jq
node revops-growth/growth-revops.mjs --json > revops.json
```

## Variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `GROWTH_BASE_URL` | URL Supabase acima | Base das Edge Functions |
| `GROWTH_API_KEY` | — | Enviado como `x-api-key` |
| `GROWTH_TOKEN` | — | Enviado como `Authorization: Bearer` |
