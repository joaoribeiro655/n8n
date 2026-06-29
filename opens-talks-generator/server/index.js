// ============================================================
//  PROXY ANTHROPIC (servidor) — guarda a API key
// ------------------------------------------------------------
//  Este é o ÚNICO lugar onde a ANTHROPIC_API_KEY existe. O browser
//  fala apenas com /api/messages; nunca recebe nem precisa da chave.
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
const API_KEY = process.env.ANTHROPIC_API_KEY

if (!API_KEY) {
  console.warn(
    '\n[Opens Talks] AVISO: ANTHROPIC_API_KEY não definida. ' +
      'Copie .env.example para .env e preencha a chave antes de gerar conteúdo.\n',
  )
}

const anthropic = new Anthropic({ apiKey: API_KEY })

const app = express()
app.use(express.json({ limit: '1mb' }))

// Healthcheck simples.
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL, hasKey: Boolean(API_KEY) })
})

// Endpoint principal: recebe { system, messages, maxTokens } e devolve { text }.
app.post('/api/messages', async (req, res) => {
  if (!API_KEY) {
    return res
      .status(500)
      .json({ error: 'Servidor sem ANTHROPIC_API_KEY configurada.' })
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
      response = await anthropic.messages.create({
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
