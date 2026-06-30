// ============================================================
//  GROWTH (Supabase) — conexão e leitura de insumos dos clientes
// ------------------------------------------------------------
//  O Growth é a plataforma de dados da Opens, com backend 100% Supabase
//  (PostgreSQL + Auth + RLS). Falamos direto com o Supabase via supabase-js,
//  autenticados como um usuário (e-mail/senha). O RLS limita o que cada
//  conta lê — então só vem o que o seu login tem permissão.
//
//  A anon key abaixo é PÚBLICA por design (já vai embutida no site do Growth)
//  e é protegida por RLS: sozinha não dá acesso a nada sem login. NUNCA use a
//  service_role key no cliente.
// ============================================================
import { createClient } from '@supabase/supabase-js'

const GROWTH_URL = 'https://cydbkzvfojvmtxmurxwq.supabase.co'
const GROWTH_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZGJrenZmb2p2bXR4bXVyeHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTUwNDAsImV4cCI6MjA4OTI3MTA0MH0.GISJ-IBdS14pnlVyzWCIUKDy1xLQQIxGHkQ-ULqVzVc'

// persistSession: mantém o login do Growth entre aberturas do app (localStorage).
// Obs.: isso vale só para a sessão do Growth; a chave da Anthropic continua no servidor.
export const growth = createClient(GROWTH_URL, GROWTH_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})

function traduzErroAuth(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado.'
  return error?.message || 'Falha ao entrar no Growth.'
}

export async function entrarGrowth(email, password) {
  const { data, error } = await growth.auth.signInWithPassword({ email, password })
  if (error) throw new Error(traduzErroAuth(error))
  return data.session
}

export async function sairGrowth() {
  await growth.auth.signOut()
}

export async function sessaoGrowth() {
  const { data } = await growth.auth.getSession()
  return data.session
}

export function aoMudarAuthGrowth(cb) {
  const { data } = growth.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

// ------------------------------------------------------------
//  INSUMOS PARA OS TEMAS DO ELGA — CARTEIRA / SUPORTE / CS
// ------------------------------------------------------------
//  Foco: o que os CLIENTES já na base estão comentando/relatando em
//  carteira, suporte e customer success — NÃO vendas/leads.
//
//  Como o Growth bloqueia introspecção para anônimos, descobrimos o schema
//  em tempo de execução (já logado, com o JWT do usuário) e selecionamos
//  automaticamente as tabelas de carteira/suporte/CS, ignorando as de vendas.
//  Tudo é "best-effort": tabela/coluna inexistente ou bloqueada por RLS é
//  simplesmente ignorada.

// Tabelas que ENTRAM (carteira/suporte/CS) e que FICAM DE FORA (vendas/leads).
const INCLUI_TABELA =
  /(suport|support|cs[_-]|customer|success|sucesso|carteira|atend|chamado|ticket|nps|feedback|churn|onboard|retenc|relacion|account|conta_)/i
const EXCLUI_TABELA =
  /(lead|deal|pipeline|sdr|prospect|venda|sale|dispatch|funnel|oportun|stage|source)/i

// Colunas cujo TEXTO representa "assunto/categoria/motivo" (rótulos curtos),
// evitando ids e PII (telefone/e-mail), corpos de mensagem e estados (status).
const COL_ASSUNTO =
  /(assunto|subject|motivo|reason|categoria|category|^tipo$|^type$|\btag\b|tema|t[ií]tulo|^title$|descri|description|summary|resumo|t[oó]pico|topic|problema|issue)/i
const COL_IGNORAR = /(^id$|_id$|uuid|email|phone|telefone|token|url|created_by|updated_by|_by$)/i
const COL_DATA = /(created_at|updated_at|happened_at|opened_at|closed_at|^date|^data$|criado|atualizado|registrad)/i

const LIMITE_POR_TABELA = 1500
const MAX_TABELAS = 12
const TAM_MAX_ASSUNTO = 120

// Override manual (se um dia quiser fixar as fontes). Vazio = descoberta automática.
// Ex.: [{ tabela: 'support_tickets', colsAssunto: ['subject','category'], colData: 'created_at' }]
const FONTES_MANUAIS = []

function normalizar(s) {
  const v = String(s ?? '').trim()
  return v.length > TAM_MAX_ASSUNTO ? v.slice(0, TAM_MAX_ASSUNTO) + '…' : v
}

// Descobre o schema acessível pela conta logada (OpenAPI do PostgREST).
async function descobrirSchema() {
  const { data } = await growth.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Conecte-se ao Growth primeiro.')
  const r = await fetch(`${GROWTH_URL}/rest/v1/`, {
    headers: { apikey: GROWTH_ANON_KEY, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error(`Não consegui ler o schema do Growth (HTTP ${r.status}).`)
  const spec = await r.json()
  const defs = spec.definitions || {}
  const schema = {}
  for (const [tabela, def] of Object.entries(defs)) {
    schema[tabela] = Object.keys(def.properties || {})
  }
  return schema
}

// A partir do schema, escolhe as tabelas/colunas de carteira/suporte/CS.
function selecionarFontes(schema) {
  const fontes = []
  for (const [tabela, colunas] of Object.entries(schema)) {
    if (!INCLUI_TABELA.test(tabela) || EXCLUI_TABELA.test(tabela)) continue
    const colsAssunto = colunas.filter((c) => COL_ASSUNTO.test(c) && !COL_IGNORAR.test(c))
    if (!colsAssunto.length) continue
    const colData = colunas.find((c) => COL_DATA.test(c)) || null
    fontes.push({ tabela, colsAssunto, colData })
  }
  return fontes.slice(0, MAX_TABELAS)
}

async function lerFonte(fonte, desdeISO) {
  try {
    const selecionar = [...new Set([...fonte.colsAssunto, fonte.colData].filter(Boolean))].join(', ')
    let q = growth.from(fonte.tabela).select(selecionar).limit(LIMITE_POR_TABELA)
    if (fonte.colData) {
      q = q.order(fonte.colData, { ascending: false })
      if (desdeISO) q = q.gte(fonte.colData, desdeISO)
    }
    const { data, error } = await q
    if (error) return { ...fonte, erro: error.message, total: 0, linhas: [] }
    return { ...fonte, total: (data || []).length, linhas: data || [] }
  } catch (e) {
    return { ...fonte, erro: e?.message || String(e), total: 0, linhas: [] }
  }
}

/**
 * Puxa e agrega os assuntos recorrentes de CARTEIRA/SUPORTE/CS (janela recente).
 * Retorna: { janelaDias, fontes:[{tabela,colsAssunto,total,erro}],
 *            tabelasCandidatas:[...], topAssuntos:[{assunto,ocorrencias}] }
 * Não envia PII — só rótulos de assunto/categoria + contagem.
 */
export async function puxarInsumosElga({ janelaDias = 90 } = {}) {
  const desdeISO = new Date(Date.now() - janelaDias * 24 * 60 * 60 * 1000).toISOString()

  const schema = await descobrirSchema()
  const candidatas = Object.keys(schema).filter(
    (t) => INCLUI_TABELA.test(t) && !EXCLUI_TABELA.test(t),
  )
  const fontes = FONTES_MANUAIS.length ? FONTES_MANUAIS : selecionarFontes(schema)

  const resultados = await Promise.all(fontes.map((f) => lerFonte(f, desdeISO)))

  const contagem = new Map()
  resultados.forEach((res) => {
    res.linhas?.forEach((linha) => {
      // cada coluna de assunto preenchida vira uma ocorrência (status, motivo, categoria…)
      res.colsAssunto.forEach((col) => {
        const assunto = normalizar(linha[col])
        if (!assunto) return
        const chave = assunto.toLowerCase()
        const atual = contagem.get(chave)
        if (atual) atual.ocorrencias += 1
        else contagem.set(chave, { assunto, ocorrencias: 1 })
      })
    })
  })

  const topAssuntos = [...contagem.values()]
    .sort((a, b) => b.ocorrencias - a.ocorrencias)
    .slice(0, 40)

  return {
    janelaDias,
    tabelasCandidatas: candidatas,
    fontes: resultados.map((r) => ({
      tabela: r.tabela,
      colsAssunto: r.colsAssunto,
      total: r.total,
      erro: r.erro,
    })),
    topAssuntos,
  }
}
