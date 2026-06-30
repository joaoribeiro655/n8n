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
//  INSUMOS PARA OS TEMAS DO ELGA
// ------------------------------------------------------------
//  Agregamos os ASSUNTOS recorrentes nas interações com clientes (suporte,
//  abordagens e atividades). O mapeamento abaixo é a melhor leitura do schema
//  documentado do Growth — ajuste aqui caso o "assunto/suporte" venha de outra
//  tabela/coluna. Cada consulta é "best-effort": se uma tabela/coluna não
//  existir ou o RLS bloquear, ela é ignorada e segue com o resto.
const CONFIG_INSUMOS = {
  janelaDias: 90,
  limitePorTabela: 2000,
  fontes: [
    // tabela, colunas, campo de data, e quais colunas viram "assunto"
    {
      tabela: 'activities',
      colunas: 'id, type, title, template_name, happened_at',
      campoData: 'happened_at',
      camposAssunto: ['title', 'template_name', 'type'],
    },
    {
      tabela: 'whatsapp_template_dispatches',
      colunas: 'template_name, created_at',
      campoData: 'created_at',
      camposAssunto: ['template_name'],
    },
  ],
}

function normalizar(s) {
  return String(s || '').trim()
}

async function lerFonte(fonte, desdeISO) {
  try {
    let q = growth
      .from(fonte.tabela)
      .select(fonte.colunas)
      .order(fonte.campoData, { ascending: false })
      .limit(CONFIG_INSUMOS.limitePorTabela)
    if (desdeISO) q = q.gte(fonte.campoData, desdeISO)
    const { data, error } = await q
    if (error) return { tabela: fonte.tabela, erro: error.message, total: 0, linhas: [] }
    return { tabela: fonte.tabela, total: (data || []).length, linhas: data || [] }
  } catch (e) {
    return { tabela: fonte.tabela, erro: e?.message || String(e), total: 0, linhas: [] }
  }
}

/**
 * Puxa e agrega os assuntos mais recorrentes do Growth (janela recente).
 * Retorna: { janelaDias, fontes:[{tabela,total,erro}], topAssuntos:[{assunto,ocorrencias}] }
 * Não envia PII (telefones etc.) — só rótulos de assunto + contagem.
 */
export async function puxarInsumosElga({ janelaDias = CONFIG_INSUMOS.janelaDias } = {}) {
  const desdeISO = new Date(Date.now() - janelaDias * 24 * 60 * 60 * 1000).toISOString()

  const resultados = await Promise.all(CONFIG_INSUMOS.fontes.map((f) => lerFonte(f, desdeISO)))

  // Conta ocorrências por assunto (agrupa por texto normalizado em minúsculas).
  const contagem = new Map() // chave -> { assunto, ocorrencias }
  resultados.forEach((res, i) => {
    const fonte = CONFIG_INSUMOS.fontes[i]
    res.linhas.forEach((linha) => {
      // pega o primeiro campo de assunto preenchido naquela linha
      let assunto = ''
      for (const campo of fonte.camposAssunto) {
        const v = normalizar(linha[campo])
        if (v) {
          assunto = v
          break
        }
      }
      if (!assunto) return
      const chave = assunto.toLowerCase()
      const atual = contagem.get(chave)
      if (atual) atual.ocorrencias += 1
      else contagem.set(chave, { assunto, ocorrencias: 1 })
    })
  })

  const topAssuntos = [...contagem.values()]
    .sort((a, b) => b.ocorrencias - a.ocorrencias)
    .slice(0, 40)

  return {
    janelaDias,
    fontes: resultados.map((r) => ({ tabela: r.tabela, total: r.total, erro: r.erro })),
    topAssuntos,
  }
}
