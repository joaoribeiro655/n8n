// Converte o plano de episódio em Markdown legível (para "Copiar tudo" / "Exportar").
export function episodioParaMarkdown(ep) {
  if (!ep) return ''

  const linhas = []
  linhas.push(`# ${ep.titulo_final || 'Episódio Opens Talks'}`)
  if (ep.subtitulo) linhas.push(`_${ep.subtitulo}_`)
  linhas.push('')
  linhas.push(`- **Duração sugerida:** ${ep.duracao_sugerida || '-'}`)
  linhas.push(`- **Formato:** ${ep.formato || '-'}`)
  linhas.push(`- **Convidado sugerido:** ${ep.convidado_sugerido || '-'}`)
  linhas.push('')

  if (ep.promessa_central) {
    linhas.push('## Promessa central')
    linhas.push(ep.promessa_central)
    linhas.push('')
  }

  if (Array.isArray(ep.agenda) && ep.agenda.length) {
    linhas.push('## Agenda')
    ep.agenda.forEach((b) => {
      const min = b.minutos != null ? ` (${b.minutos} min)` : ''
      linhas.push(`- **${b.bloco || 'Bloco'}**${min}: ${b.descricao || ''}`)
    })
    linhas.push('')
  }

  if (ep.cta_final) {
    linhas.push('## CTA final')
    linhas.push(ep.cta_final)
    linhas.push('')
  }

  if (ep.copy_landing_page) {
    linhas.push('## Copy — Landing page')
    linhas.push(ep.copy_landing_page)
    linhas.push('')
  }

  if (ep.copy_email_convite) {
    linhas.push('## Copy — E-mail de convite')
    linhas.push(ep.copy_email_convite)
    linhas.push('')
  }

  if (ep.copy_linkedin) {
    linhas.push('## Copy — LinkedIn')
    linhas.push(ep.copy_linkedin)
    linhas.push('')
  }

  if (Array.isArray(ep.hashtags) && ep.hashtags.length) {
    linhas.push('## Hashtags')
    linhas.push(ep.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '))
    linhas.push('')
  }

  return linhas.join('\n').trim()
}

// Copia texto para a área de transferência (com fallback para navegadores antigos).
export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = texto
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

// Dispara o download de um arquivo .md.
export function baixarMarkdown(nomeArquivo, conteudo) {
  const blob = new Blob([conteudo], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
