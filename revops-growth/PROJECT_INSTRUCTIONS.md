# Instruções do Projeto — Opens Growth Hub

> Cole este conteúdo no campo **Instruções** do Project (claude.ai) e/ou use como
> base de um `CLAUDE.md` no repositório `opens-growth-hub-94e70065`.
> Itens marcados com `⚠️ CONFIRMAR` são suposições a validar contra o código real.

## 1. O que é o projeto

O **Opens Growth Hub** é a plataforma de **RevOps/CRM** da Opens: centraliza
oportunidades (deals), atividades comerciais, clientes, contatos e o pipeline de
vendas. Serve para acompanhar pipeline, win rate, receita e a operação do time
comercial.

- Repositório: `douglasconrad/opens-growth-hub-94e70065`
- Stakeholder principal: **Douglas** (dono do repo) — pede as alterações.
- Idioma do produto e da comunicação: **português (pt-BR)**.

## 2. Stack técnica

- **Backend/dados:** Supabase (PostgreSQL + Edge Functions em Deno/TypeScript).
- **Edge Functions** expõem a API pública em:
  `https://cydbkzvfojvmtxmurxwq.supabase.co/functions/v1`
- **Frontend:** TypeScript. ⚠️ CONFIRMAR framework (React/Vite? Next?) ao ler o repo.
- **Auth da API:** modo público (sem auth) **ou** header `x-api-key: <chave>` /
  `Authorization: Bearer <token>`.

## 3. Glossário do domínio

| Entidade | O que é | Campos-chave |
|---|---|---|
| **Deal** (oportunidade) | Negócio no pipeline | `id`, `title`, `value`, `deal_type`, `win`, `source`, relações: `client`, `stage`, `funnel`, `owner` |
| **Activity** (atividade) | Interação comercial | `id`, `title`, `status`, `happened_at`, relações: `client`, `contact`, `user`, `activity_type` |
| **Funnel** (funil) | Pipeline de vendas | `id`, `name` |
| **Stage** (etapa) | Fase dentro do funil | `id`, `name` |
| **Client** (cliente) | Empresa | `id`, `company_name` |
| **Contact** (contato) | Pessoa do cliente | `id`, `nome` |
| **Owner/User** (responsável) | Vendedor/usuário | `id`, `full_name` |
| **Activity Type / Category** | Tipo e categoria da atividade | `id`, `name`, `category_id` |

**Enums importantes:**
- `deal_type`: `new_business` | `upsell` | `renewal` | `cross_sell`
- `win`: `true` (ganha) | `false` (perdida) | `null` (aberta)
- `activity.status`: `completed` | `scheduled` | `cancelled`

## 4. API (Edge Functions conhecidas)

### `GET /query-deals`
Busca oportunidades. Filtros: `id` (UUID, retorna deal completo + contatos),
`funnel_id`, `stage_id`, `owner_id`, `win` (true|false|null), `deal_type`,
`search` (título), `source` (contém, case-insensitive). Paginação: `limit`
(100), `offset` (0). Ordena por `created_at` desc. Inclui `client`, `stage`,
`funnel`, `owner`.

### `GET /query-activities`
Busca atividades. Filtros: `id`, `date_from`/`date_to` (ISO 8601, sobre
`happened_at`), `activity_type_id`, `category_id`, `client_id`, `contact_id`,
`user_id`, `deal_id`, `status`. Paginação: `limit`/`offset`. Ordena por
`happened_at` desc.

⚠️ CONFIRMAR: provavelmente existem outras functions (clientes, contatos,
mutações de escrita). Mapear todas em `supabase/functions/` ao ler o repo.

## 5. Como trabalhar neste projeto (regras pro Claude)

1. **Branch + PR sempre.** Nunca commitar direto na `main`. Criar branch
   descritiva (ex.: `feat/filtro-source-deals`) e abrir Pull Request para o
   Douglas revisar.
2. **Não criar PR sem o usuário pedir.** Implementar, commitar e, quando pedido,
   abrir o PR.
3. **pt-BR** em mensagens de UI, comentários voltados ao time e descrições de PR.
4. **Segredos nunca no código.** `SUPABASE_*`, service-role keys e API keys vivem
   em variáveis de ambiente / secrets do Supabase — jamais commitar.
5. **Edge Functions Supabase** seguem o padrão Deno. Validar input, tratar erros
   retornando `{ success, data, count, offset, limit }` como as functions atuais.
6. **Antes de mudar schema/dados:** confirmar com o usuário. Migrações de banco
   afetam produção.
7. **Testar/validar** o que der antes de marcar como pronto; relatar honestamente
   o que ficou sem testar.

## 6. Pré-requisitos de ambiente (Claude Code)

- **Acesso ao repo:** ambiente do Claude Code (code.claude.com) com
  `opens-growth-hub-94e70065` no escopo + GitHub App autorizado (usuário é Admin).
- **Rede (para bater na API live):** liberar o host
  `cydbkzvfojvmtxmurxwq.supabase.co` na allowlist de egress do ambiente.

## 7. Tarefas típicas (preencher com o Douglas)

⚠️ CONFIRMAR — exemplos a ajustar conforme o que o Douglas costuma pedir:
- Ajustes/novos filtros nos endpoints de consulta.
- Novos relatórios de RevOps (pipeline, win rate, forecast).
- Campos novos em deals/atividades.
- Correções de bug na UI do hub.
