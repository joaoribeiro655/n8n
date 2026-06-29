// Helpers para a tela de Configuração — falam com o proxy.
// A chave NUNCA é guardada no browser (sem localStorage); ela vai para a
// memória do servidor e o front só consulta o status.

export async function getStatus() {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error('Não consegui falar com o servidor.')
  return res.json() // { ok, model, hasKey, source }
}

export async function salvarChave(apiKey) {
  const res = await fetch('/api/config/key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Não consegui salvar a chave.')
  return data
}

export async function removerChave() {
  const res = await fetch('/api/config/key', { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Não consegui remover a chave.')
  return data
}

export async function testarConexao() {
  const res = await fetch('/api/test', { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok) {
    throw new Error(data?.error || 'A chave não passou no teste.')
  }
  return data
}
