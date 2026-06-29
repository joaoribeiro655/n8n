// ============================================================
//  PROXY ANTHROPIC (servidor) — guarda a API key
// ------------------------------------------------------------
//  Este é o ÚNICO lugar onde a chave da Anthropic existe. O browser
//  fala apenas com /api/*; nunca recebe a chave de volta nem a embute
//  no bundle. A chave pode vir de duas fontes:
//    1) variável de ambiente ANTHROPIC_API_KEY (.env), ou
//    2) configurada em tempo de execução pela tela de Configuração
//       do app (POST /api/config/key) — fica só na MEMÓRIA do servidor.
//  O modelo é fixado aqui (claude-sonnet-4-6) — o cliente não escolhe.
// ============================================================
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const PORT = process.env.PORT || 8787
const MODEL = 'claude-sonnet-4-6' // modelo pedido no brief

// ---- Gestão da chave em tempo de execução ----
// `runtimeKey` é definida pela tela de Configuração e vive só em memória
// (some quando o servidor reinicia). A env serve de fallback.
let runtimeKey = null
let cachedClient = null
let cachedClientKey = null

function effectiveKey() {
  return runtimeKey || process.env.ANTHROPIC_API_KEY || null
}

// Indica de onde veio a chave ativa (para a UI exibir status).
function keySource() {
  if (runtimeKey) return 'runtime'
  if (process.env.ANTHROPIC_API_KEY) return 'env'
  return null
}

// Cria/reaproveita o client conforme a chave ativa.
function getClient() {
  const key = effectiveKey()
  if (!key) return null
  if (!cachedClient || cachedClientKey !== key) {
    cachedClient = new Anthropic({ apiKey: key })
    cachedClientKey = key
  }
  return cachedClient
}

// Validação leve de formato (não garante que a chave funciona, só evita erros bobos).
function pareceChaveValida(k) {
  return typeof k === 'string' && /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k.trim())
}

if (!effectiveKey()) {
  console.warn(
    '\n[Opens Talks] Nenhuma chave configurada ainda. ' +
      'Use a tela de Configuração no app, ou copie .env.example para .env.\n',
  )
}

const app = express()
app.use(express.json({ limit: '1mb' }))

// Healthcheck + status da chave (a chave em si NUNCA é devolvida).
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL, hasKey: Boolean(effectiveKey()), source: keySource() })
})

// Define a chave em tempo de execução (vinda da tela de Configuração).
app.post('/api/config/key', (req, res) => {
  const { apiKey } = req.body || {}
  if (!pareceChaveValida(apiKey)) {
    return res
      .status(400)
      .json({ error: 'Chave inválida. Ela deve começar com "sk-ant-".' })
  }
  runtimeKey = apiKey.trim()
  cachedClient = null // força recriar o client com a nova chave
  res.json({ ok: true, hasKey: true, source: 'runtime' })
})

// Remove a chave configurada em tempo de execução (volta para a env, se houver).
app.delete('/api/config/key', (_req, res) => {
  runtimeKey = null
  cachedClient = null
  res.json({ ok: true, hasKey: Boolean(effectiveKey()), source: keySource() })
})

// Testa a chave ativa com uma chamada mínima (poucos tokens).
app.post('/api/test', async (_req, res) => {
  const client = getClient()
  if (!client) return res.status(400).json({ ok: false, error: 'Nenhuma chave configurada.' })
  try {
    await client.messages.create({
      model: MODEL,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'ping' }],
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('[Opens Talks] Teste de chave falhou:', err?.message || err)
    res.status(err?.status && Number.isInteger(err.status) ? err.status : 502).json({
      ok: false,
      error: err?.message || 'Falha ao validar a chave.',
    })
  }
})

// Endpoint principal: recebe { system, messages, maxTokens, webSearch } e devolve { text }.
app.post('/api/messages', async (req, res) => {
  const client = getClient()
  if (!client) {
    return res
      .status(400)
      .json({ error: 'Nenhuma chave da Anthropic configurada. Abra a Configuração e cole sua chave.' })
  }

  const { system, messages, maxTokens, webSearch } = req.body || {}

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Campo "messages" é obrigatório.' })
  }

  // Busca na web (server-side) para ancorar sugestões em notícias/contexto atual.
  // claude-sonnet-4-6 suporta a versão com filtragem dinâmica.
  const tools = webSearch
    ? [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }]
    : undefined

  try {
    // Loop de continuação: com ferramentas server-side, a API pode devolver
    // stop_reason "pause_turn" se o loop interno atingir o limite de iterações.
    // Nesse caso, reenviamos a conversa para ela continuar de onde parou.
    let convo = [...messages]
    let response
    let guard = 0
    do {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: Number(maxTokens) || 4000,
        system: typeof system === 'string' ? system : undefined,
        messages: convo,
        ...(tools ? { tools } : {}),
      })

      if (response.stop_reason === 'pause_turn') {
        convo = [...convo, { role: 'assistant', content: response.content }]
      }
      guard += 1
    } while (response.stop_reason === 'pause_turn' && guard < 6)

    // Concatena os blocos de texto da resposta final (o JSON vem aqui;
    // o parser do cliente isola o bloco { ... } se houver texto de busca antes).
    const text = (response.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    res.json({ text })
  } catch (err) {
    // Não vaza detalhes sensíveis; loga no servidor e devolve mensagem limpa.
    console.error('[Opens Talks] Erro ao chamar a Anthropic:', err?.message || err)
    const status = err?.status && Number.isInteger(err.status) ? err.status : 502
    res
      .status(status)
      .json({ error: err?.message || 'Erro ao chamar a API da Anthropic.' })
  }
})

// Em produção, serve o build estático do Vite (pasta dist).
const distDir = path.join(ROOT, 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`[Opens Talks] Proxy rodando em http://localhost:${PORT} (modelo: ${MODEL})`)
})
