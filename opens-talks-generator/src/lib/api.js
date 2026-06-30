// ============================================================
//  CHAMADAS À API (lado do cliente)
// ------------------------------------------------------------
//  O browser NUNCA fala direto com a Anthropic e nunca vê a API key.
//  Aqui montamos o system prompt + messages e enviamos para o nosso
//  proxy Express em /api/messages, que injeta a chave e usa o modelo
//  claude-sonnet-4-6. O proxy devolve o texto cru gerado pela API.
//
//  Quando `webSearch` é true, o proxy ativa a ferramenta de busca na
//  web (server-side) para o modelo ancorar as sugestões em notícias,
//  tecnologia e contexto atual da sociedade.
// ============================================================

import { dataDeHoje } from './opensContext.js'

/**
 * Faz a chamada ao proxy. `system` e `messages` seguem o formato da
 * Messages API da Anthropic. Como a API não tem memória, todo o contexto
 * necessário precisa ser enviado em cada chamada.
 */
async function callClaude({ system, messages, maxTokens, webSearch }) {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, maxTokens, webSearch: Boolean(webSearch) }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.error || ''
    } catch {
      /* corpo não-JSON: ignora */
    }
    throw new Error(detail || `Falha na requisição (HTTP ${res.status}).`)
  }

  const data = await res.json()
  return data.text || ''
}

/**
 * Faz parse seguro de uma resposta que deveria ser JSON puro.
 * Defende contra cercas de markdown (```json ... ```), preâmbulos e
 * texto que o modelo escreve antes/depois de buscar na web, extraindo
 * o maior bloco { ... } encontrado.
 */
function safeParseJson(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Resposta vazia da API.')
  }

  // 1ª tentativa: parse direto.
  try {
    return JSON.parse(raw)
  } catch {
    /* tenta limpar abaixo */
  }

  // Remove cercas de código, se houver.
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')

  // 2ª tentativa após remover as cercas.
  try {
    return JSON.parse(cleaned)
  } catch {
    /* tenta extrair o bloco abaixo */
  }

  // 3ª tentativa: extrai do primeiro "{" até o último "}".
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    const slice = cleaned.slice(start, end + 1)
    try {
      return JSON.parse(slice)
    } catch {
      /* desiste abaixo */
    }
  }

  throw new Error('Não consegui interpretar a resposta como JSON válido.')
}

/**
 * TELA 1 — gera uma lista de temas para a série Opens Talks.
 * Retorna: { temas: [{ titulo, angulo, dor_principal, publico_alvo, gancho_de_atracao, contexto_atual }] }
 */
export async function gerarTemas(
  { tema = '', intuito = '', vertical, objetivo, nivelFunil, quantidade, webSearch = true },
  systemContext,
) {
  // Bloco com o que o organizador escreveu (texto livre) — quando preenchido,
  // é a instrução mais importante e deve guiar todas as sugestões.
  const blocoOrganizador =
    tema.trim() || intuito.trim()
      ? `DESCRIÇÃO DO ORGANIZADOR (PRIORIZE ISTO):
${tema.trim() ? `- Tema desejado: ${tema.trim()}` : ''}
${intuito.trim() ? `- Intuito da live: ${intuito.trim()}` : ''}
`
      : ''

  const userPrompt = `Hoje é ${dataDeHoje()}. Gere ${quantidade} temas de LIVE para a série "Opens Talks".

${blocoOrganizador}${
  webSearch
    ? `ANTES de sugerir, pesquise na web notícias e tendências RECENTES (últimas semanas) sobre tecnologia, IA, comportamento do consumidor, economia e atendimento/CX que sejam relevantes para o tema/intuito acima e para a vertical "${vertical}". Ancore cada tema em algo que está em pauta AGORA.`
    : `Conecte cada tema ao contexto atual de sociedade, tecnologia e atendimento/CX.`
}

PARÂMETROS DE APOIO (refinam, mas não sobrepõem a descrição do organizador):
- Vertical: ${vertical}
- Objetivo da live: ${objetivo}
- Nível de funil: ${nivelFunil}
- Quantidade de temas: ${quantidade}

Cada tema deve respeitar a descrição do organizador (quando houver), atacar uma dor real de atendimento/CX coerente com a vertical, o objetivo e o nível de funil, e ter conexão clara com o momento atual.

Responda SOMENTE com JSON neste formato exato:
{
  "temas": [
    {
      "titulo": "string — título chamativo da live",
      "angulo": "string — o ângulo/abordagem editorial do tema",
      "dor_principal": "string — a dor central que o tema resolve",
      "publico_alvo": "string — quem é o público ideal desta live",
      "gancho_de_atracao": "string — gancho para atrair inscrições",
      "contexto_atual": "string — a notícia/tendência atual que justifica o tema agora"
    }
  ]
}`

  const raw = await callClaude({
    system: systemContext,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 5000,
    webSearch,
  })

  const parsed = safeParseJson(raw)
  if (!parsed || !Array.isArray(parsed.temas)) {
    throw new Error('JSON retornado não contém a lista de temas esperada.')
  }
  return parsed.temas
}

/**
 * ELGA — gera temas "em alta" a partir dos assuntos reais dos clientes (Growth).
 * `insumos` vem de puxarInsumosElga() (lib/growth.js): { topAssuntos:[{assunto,ocorrencias}] }.
 * Retorna a mesma forma de tema dos cards (+ campo baseado_em).
 */
export async function gerarTemasElga(
  { insumos, quantidade = 5, foco = '', webSearch = true },
  systemContext,
) {
  const lista = (insumos?.topAssuntos || [])
    .map((a) => `- ${a.assunto} (${a.ocorrencias}x)`)
    .join('\n')

  if (!lista) {
    throw new Error('Não há assuntos suficientes do Growth para gerar temas. Verifique sua conexão/permissões.')
  }

  const userPrompt = `Hoje é ${dataDeHoje()}. Gere ${quantidade} temas de conteúdo/live "em alta" para o ELGA (programa educacional para CLIENTES da Opens).

Os temas devem partir DIRETAMENTE dos assuntos abaixo — eles foram extraídos de dados reais de CARTEIRA, SUPORTE e CS (clientes da base), nos últimos ${insumos?.janelaDias || 90} dias. NÃO são dados de vendas/leads. Priorize os mais recorrentes e que rendem boa aula prática.

ASSUNTOS RECORRENTES DOS CLIENTES (carteira/suporte/CS — dados do Growth):
${lista}
${foco.trim() ? `\nFOCO ADICIONAL DO ORGANIZADOR: ${foco.trim()}` : ''}
${
  webSearch
    ? '\nSe ajudar, pesquise na web boas práticas/novidades recentes ligadas a esses assuntos para enriquecer os temas.'
    : ''
}

Responda SOMENTE com JSON neste formato exato:
{
  "temas": [
    {
      "titulo": "string — título didático e chamativo",
      "angulo": "string — abordagem prática do tema",
      "dor_principal": "string — a dor do cliente que o tema resolve",
      "publico_alvo": "string — qual perfil de cliente da base aproveita mais",
      "gancho_de_atracao": "string — gancho para o cliente participar",
      "baseado_em": "string — quais assuntos do Growth originaram este tema",
      "contexto_atual": "string — conexão com o momento atual (ou vazio)"
    }
  ]
}`

  const raw = await callClaude({
    system: systemContext,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 5000,
    webSearch,
  })

  const parsed = safeParseJson(raw)
  if (!parsed || !Array.isArray(parsed.temas)) {
    throw new Error('JSON retornado não contém a lista de temas esperada.')
  }
  return parsed.temas
}

/**
 * TELA 2 — monta o plano completo de uma live a partir de um tema escolhido.
 * Reenviamos os parâmetros da Tela 1 + o tema selecionado (a API não tem memória).
 * Inclui 3 posts de aquecimento para promover a live antes dela acontecer.
 */
export async function montarEpisodio({ tema, contextoGeracao }, systemContext) {
  const webSearch = contextoGeracao?.webSearch !== false

  const userPrompt = `Hoje é ${dataDeHoje()}. Monte o PLANO COMPLETO de uma LIVE da série "Opens Talks" a partir do tema escolhido abaixo.

${
  webSearch
    ? 'Se útil, pesquise na web dados/notícias recentes para deixar os ganchos e copies conectados ao momento atual.'
    : ''
}

CONTEXTO DA GERAÇÃO ORIGINAL DOS TEMAS:
${contextoGeracao.tema?.trim() ? `- Tema desejado pelo organizador: ${contextoGeracao.tema.trim()}` : ''}
${contextoGeracao.intuito?.trim() ? `- Intuito da live: ${contextoGeracao.intuito.trim()}` : ''}
- Vertical: ${contextoGeracao.vertical}
- Objetivo: ${contextoGeracao.objetivo}
- Nível de funil: ${contextoGeracao.nivelFunil}

TEMA ESCOLHIDO:
- Título: ${tema.titulo}
- Ângulo: ${tema.angulo}
- Dor principal: ${tema.dor_principal}
- Público-alvo: ${tema.publico_alvo}
- Gancho de atração: ${tema.gancho_de_atracao}
- Contexto atual: ${tema.contexto_atual || '—'}

Lembre-se: é uma LIVE (transmissão ao vivo), com interação da audiência.
Inclua 3 POSTS DE AQUECIMENTO para serem publicados ANTES da live, em sequência (ex.: 5 dias antes, 2 dias antes, no dia), aumentando a expectativa.

Responda SOMENTE com JSON neste formato exato:
{
  "titulo_final": "string",
  "subtitulo": "string",
  "duracao_sugerida": "string (ex: 45 minutos ao vivo)",
  "formato": "string (palestra solo ao vivo / entrevista ao vivo / painel ao vivo)",
  "convidado_sugerido": "string — perfil ideal do convidado, NÃO um nome real",
  "agenda": [
    { "bloco": "string", "minutos": 0, "descricao": "string" }
  ],
  "promessa_central": "string",
  "cta_final": "string",
  "copy_landing_page": "string — copy pronta para a landing page de inscrição",
  "copy_email_convite": "string — copy pronta para o e-mail de convite",
  "copy_linkedin": "string — copy pronta para post no LinkedIn",
  "posts_aquecimento": [
    {
      "quando": "string — quando publicar (ex: 5 dias antes)",
      "canal": "string — rede/canal sugerido (ex: LinkedIn)",
      "objetivo": "string — o que esse post deve provocar",
      "copy": "string — texto pronto do post"
    }
  ],
  "hashtags": ["string"]
}`

  const raw = await callClaude({
    system: systemContext,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 6000,
    webSearch,
  })

  const parsed = safeParseJson(raw)
  if (!parsed || !parsed.titulo_final) {
    throw new Error('JSON retornado não contém o plano de live esperado.')
  }
  return parsed
}
