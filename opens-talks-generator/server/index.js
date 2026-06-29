// ============================================================
//  PROXY ANTHROPIC (servidor) — guarda a API key
// ------------------------------------------------------------
//  Este é o ÚNICO lugar onde a chave da Anthropic existe. O browser
//  (ou a janela do app desktop) fala apenas com /api/*; nunca recebe a
//  chave de volta nem a embute no bundle. A chave pode vir de:
//    1) variável de ambiente ANTHROPIC_API_KEY (.env), ou
//    2) configurada em tempo de execução pela tela de Configuração
//       (POST /api/config/key). No app desktop (Electron) ela é
//       persistida no arquivo apontado por OPENS_KEY_FILE (userData).
//  O modelo é fixado aqui (claude-sonnet-4-6) — o cliente não escolhe.
//
//  Pode ser usado de dois jeitos:
//    - CLI: `node server/index.js` (sobe e escuta na PORT).
//    - Embutido: `import { startServer } from './server/index.js'` (Electron).
// ============================================================
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import fs from 'node:fs'
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const MODEL = 'claude-sonnet-4-6' // modelo pedido no brief

// Arquivo opcional para persistir a chave (usado pelo app desktop).
const KEY_FILE = process.env.OPENS_KEY_FILE || null

// ---- Gestão da chave em tempo de execução ----
// `runtimeKey` é definida pela tela de Configuração e vive em memória.
// Se KEY_FILE estiver setado, também é lida/gravada em disco (uso desktop).
let runtimeKey = null
let cachedClient = null
let cachedClientKey = null

function pareceChaveValida(k) {
  return typeof k === 'string' && /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k.trim())
}

// Carrega a chave persistida (se houver) na inicialização.
function carregarChavePersistida() {
  if (!KEY_FILE) return
  try {
    if (fs.existsSync(KEY_FILE)) {
      const k = fs.readFileSync(KEY_FILE, 'utf8').trim()
      if (pareceChaveValida(k)) runtimeKey = k
    }
  } catch (e) {
    console.warn('[Opens Talks] Não consegui ler a chave persistida:', e?.message || e)
  }
}

function persistirChave(k) {
  if (!KEY_FILE) return
  try {
    fs.writeFileSync(KEY_FILE, k, { mode: 0o600 })
  } catch (e) {
    console.warn('[Opens Talks] Não consegui salvar a chave em disco:', e?.message || e)
  }
}

function apagarChavePersistida() {
  if (!KEY_FILE) return
  try {
    if (fs.existsSync(KEY_FILE)) fs.unlinkSync(KEY_FILE)
  } catch (e) {
    console.warn('[Opens Talks] Não consegui apagar a chave persistida:', e?.message || e)
  }
}

function effectiveKey() {
  return runtimeKey || process.env.ANTHROPIC_API_KEY || null
}

function keySource() {
  if (runtimeKey) return 'runtime'
  if (process.env.ANTHROPIC_API_KEY) return 'env'
  return null
}

function getClient() {
  const key = effectiveKey()
  if (!key) return null
  if (!cachedClient || cachedClientKey !== key) {
    cachedClient = new Anthropic({ apiKey: key })
    cachedClientKey = key
  }
  return cachedClient
}

// Monta o app Express com todas as rotas. `serveStatic` controla se servimos
// o build do Vite (dist) — útil para produção e para o app desktop.
export function createApp({ serveStatic = true } = {}) {
  carregarChavePersistida()

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
      return res.status(400).json({ error: 'Chave inválida. Ela deve começar com "sk-ant-".' })
    }
    runtimeKey = apiKey.trim()
    cachedClient = null
    persistirChave(runtimeKey)
    res.json({ ok: true, hasKey: true, source: 'runtime' })
  })

  // Remove a chave configurada em tempo de execução (volta para a env, se houver).
  app.delete('/api/config/key', (_req, res) => {
    runtimeKey = null
    cachedClient = null
    apagarChavePersistida()
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
    const tools = webSearch
      ? [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }]
      : undefined

    try {
      // Loop de continuação: ferramentas server-side podem devolver "pause_turn".
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

      const text = (response.content || [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')

      res.json({ text })
    } catch (err) {
      console.error('[Opens Talks] Erro ao chamar a Anthropic:', err?.message || err)
      const status = err?.status && Number.isInteger(err.status) ? err.status : 502
      res.status(status).json({ error: err?.message || 'Erro ao chamar a API da Anthropic.' })
    }
  })

  // Build estático do Vite (produção e app desktop).
  if (serveStatic) {
    const distDir = path.join(ROOT, 'dist')
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir))
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'))
      })
    }
  }

  return app
}

// Sobe o servidor e resolve com a porta efetiva (porta 0 = porta livre do SO).
export function startServer({ port = process.env.PORT || 8787, host = '127.0.0.1' } = {}) {
  const app = createApp()
  return new Promise((resolve) => {
    const server = app.listen(port, host, () => {
      const actualPort = server.address().port
      console.log(`[Opens Talks] Proxy em http://${host}:${actualPort} (modelo: ${MODEL})`)
      resolve({ server, port: actualPort, host })
    })
  })
}

// Execução direta via CLI (`node server/index.js`).
const executadoDireto =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (executadoDireto) {
  if (!effectiveKey() && !KEY_FILE) {
    console.warn(
      '\n[Opens Talks] Nenhuma chave configurada ainda. ' +
        'Use a tela de Configuração no app, ou copie .env.example para .env.\n',
    )
  }
  startServer()
}
