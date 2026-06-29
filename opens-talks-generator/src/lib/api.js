// ============================================================
//  CHAMADAS À API (lado do cliente)
// ------------------------------------------------------------
//  O browser NUNCA fala direto com a Anthropic e nunca vê a API key.
//  Aqui montamos o system prompt + messages e enviamos para o nosso
//  proxy Express em /api/messages, que injeta a chave e usa o modelo
//  claude-sonnet-4-6. O proxy devolve o texto cru gerado pela API.
// ============================================================

/**
 * Faz a chamada ao proxy. `system` e `messages` seguem o formato da
 * Messages API da Anthropic. Como a API não tem memória, todo o contexto
 * necessário precisa ser enviado em cada chamada.
 */
async function callClaude({ system, messages, maxTokens }) {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, maxTokens }),
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
 * Defende contra cercas de markdown (```json ... ```) e preâmbulos,
 * extraindo o maior bloco { ... } encontrado.
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
 * Retorna: { temas: [{ titulo, angulo, dor_principal, publico_alvo, gancho_de_atracao }] }
 */
export async function gerarTemas({ vertical, objetivo, nivelFunil, quantidade }, systemContext) {
  const userPrompt = `Gere ${quantidade} temas de webinar para a série "Opens Talks".

PARÂMETROS:
- Vertical: ${vertical}
- Objetivo do webinar: ${objetivo}
- Nível de funil: ${nivelFunil}
- Quantidade de temas: ${quantidade}

Cada tema deve atacar uma dor real de atendimento/CX coerente com a vertical, o objetivo e o nível de funil escolhidos.

Responda SOMENTE com JSON neste formato exato:
{
  "temas": [
    {
      "titulo": "string — título chamativo do episódio",
      "angulo": "string — o ângulo/abordagem editorial do tema",
      "dor_principal": "string — a dor central que o tema resolve",
      "publico_alvo": "string — quem é o público ideal deste episódio",
      "gancho_de_atracao": "string — gancho para atrair inscrições"
    }
  ]
}`

  const raw = await callClaude({
    system: systemContext,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 4000,
  })

  const parsed = safeParseJson(raw)
  if (!parsed || !Array.isArray(parsed.temas)) {
    throw new Error('JSON retornado não contém a lista de temas esperada.')
  }
  return parsed.temas
}

/**
 * TELA 2 — monta o plano completo de um episódio a partir de um tema escolhido.
 * Reenviamos os parâmetros da Tela 1 + o tema selecionado (a API não tem memória).
 */
export async function montarEpisodio({ tema, contextoGeracao }, systemContext) {
  const userPrompt = `Monte o PLANO COMPLETO de um episódio da série "Opens Talks" a partir do tema escolhido abaixo.

CONTEXTO DA GERAÇÃO ORIGINAL DOS TEMAS:
- Vertical: ${contextoGeracao.vertical}
- Objetivo: ${contextoGeracao.objetivo}
- Nível de funil: ${contextoGeracao.nivelFunil}

TEMA ESCOLHIDO:
- Título: ${tema.titulo}
- Ângulo: ${tema.angulo}
- Dor principal: ${tema.dor_principal}
- Público-alvo: ${tema.publico_alvo}
- Gancho de atração: ${tema.gancho_de_atracao}

Responda SOMENTE com JSON neste formato exato:
{
  "titulo_final": "string",
  "subtitulo": "string",
  "duracao_sugerida": "string (ex: 45 minutos)",
  "formato": "string (palestra solo / entrevista / painel)",
  "convidado_sugerido": "string — perfil ideal do convidado, NÃO um nome real",
  "agenda": [
    { "bloco": "string", "minutos": 0, "descricao": "string" }
  ],
  "promessa_central": "string",
  "cta_final": "string",
  "copy_landing_page": "string — copy pronta para a landing page de inscrição",
  "copy_email_convite": "string — copy pronta para o e-mail de convite",
  "copy_linkedin": "string — copy pronta para post no LinkedIn",
  "hashtags": ["string"]
}`

  const raw = await callClaude({
    system: systemContext,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 5000,
  })

  const parsed = safeParseJson(raw)
  if (!parsed || !parsed.titulo_final) {
    throw new Error('JSON retornado não contém o plano de episódio esperado.')
  }
  return parsed
}
