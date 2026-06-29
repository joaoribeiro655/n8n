import { useEffect, useState } from 'react'
import { Button, Spinner, ErrorBanner } from './ui.jsx'
import { montarEpisodio } from '../lib/api.js'
import { OPENS_SYSTEM_CONTEXT } from '../lib/opensContext.js'
import { episodioParaMarkdown, copiarTexto, baixarMarkdown } from '../lib/markdown.js'

// TELA 2 — Criador de Episódio.
// Recebe o tema escolhido + o contexto de geração e busca o plano completo.
export default function EpisodeBuilder({ tema, contextoGeracao, onVoltar }) {
  const [episodio, setEpisodio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)

  // ===== CHAMADA DE API: monta o episódio assim que a tela abre =====
  async function carregar() {
    setLoading(true)
    setError('')
    try {
      const plano = await montarEpisodio({ tema, contextoGeracao }, OPENS_SYSTEM_CONTEXT)
      setEpisodio(plano)
    } catch (err) {
      setError(err.message || 'Erro ao montar o episódio.')
      setEpisodio(null)
    } finally {
      setLoading(false)
    }
  }

  // Dispara a geração quando o tema muda (inclui a primeira montagem).
  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tema])

  async function handleCopiarTudo() {
    const md = episodioParaMarkdown(episodio)
    const ok = await copiarTexto(md)
    if (ok) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  function handleExportar() {
    const md = episodioParaMarkdown(episodio)
    const nome =
      (episodio?.titulo_final || 'opens-talks-episodio')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '.md'
    baixarMarkdown(nome, md)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" onClick={onVoltar}>
          ← Voltar aos temas
        </Button>

        {episodio && !loading && (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleCopiarTudo}>
              {copiado ? '✓ Copiado!' : 'Copiar tudo'}
            </Button>
            <Button onClick={handleExportar}>Exportar Markdown</Button>
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-10 text-center">
          <Spinner label="Montando o plano completo do episódio…" />
        </div>
      )}

      <ErrorBanner message={error} />
      {error && !loading && (
        <Button variant="secondary" onClick={carregar}>
          Tentar novamente
        </Button>
      )}

      {episodio && !loading && <EpisodioView ep={episodio} />}
    </div>
  )
}

function EpisodioView({ ep }) {
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <section className="rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-6">
        <h2 className="text-2xl font-extrabold leading-tight">{ep.titulo_final}</h2>
        {ep.subtitulo && (
          <p className="mt-2 text-lg text-[var(--opens-text-muted)]">{ep.subtitulo}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Tag>⏱ {ep.duracao_sugerida}</Tag>
          <Tag>🎙 {ep.formato}</Tag>
        </div>
        {ep.convidado_sugerido && (
          <p className="mt-4 text-sm">
            <span className="font-semibold text-[var(--opens-accent-2)]">Convidado sugerido: </span>
            {ep.convidado_sugerido}
          </p>
        )}
      </section>

      {/* Promessa + CTA */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {ep.promessa_central && (
          <Bloco titulo="Promessa central">{ep.promessa_central}</Bloco>
        )}
        {ep.cta_final && <Bloco titulo="CTA final">{ep.cta_final}</Bloco>}
      </div>

      {/* Agenda */}
      {Array.isArray(ep.agenda) && ep.agenda.length > 0 && (
        <section className="rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-6">
          <h3 className="mb-4 text-base font-bold">Agenda</h3>
          <ol className="space-y-3">
            {ep.agenda.map((b, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-xl border border-[var(--opens-border)] bg-[var(--opens-surface-2)] p-4"
              >
                <span className="shrink-0 rounded-md bg-[var(--opens-accent)]/20 px-2.5 py-1 text-xs font-bold text-[var(--opens-accent)]">
                  {b.minutos != null ? `${b.minutos} min` : `#${i + 1}`}
                </span>
                <div>
                  <p className="font-semibold">{b.bloco}</p>
                  {b.descricao && (
                    <p className="mt-0.5 text-sm text-[var(--opens-text-muted)]">{b.descricao}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Copies */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {ep.copy_landing_page && <CopyBloco titulo="Landing page" texto={ep.copy_landing_page} />}
        {ep.copy_email_convite && <CopyBloco titulo="E-mail de convite" texto={ep.copy_email_convite} />}
        {ep.copy_linkedin && <CopyBloco titulo="LinkedIn" texto={ep.copy_linkedin} />}
      </div>

      {/* Posts de aquecimento */}
      {Array.isArray(ep.posts_aquecimento) && ep.posts_aquecimento.length > 0 && (
        <section className="rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-6">
          <h3 className="mb-1 text-base font-bold">Posts de aquecimento</h3>
          <p className="mb-4 text-sm text-[var(--opens-text-muted)]">
            Sequência para publicar antes da live e gerar expectativa.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ep.posts_aquecimento.map((post, i) => (
              <PostAquecimentoCard key={i} post={post} indice={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Hashtags */}
      {Array.isArray(ep.hashtags) && ep.hashtags.length > 0 && (
        <section className="rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-6">
          <h3 className="mb-3 text-base font-bold">Hashtags</h3>
          <div className="flex flex-wrap gap-2">
            {ep.hashtags.map((h, i) => (
              <span
                key={i}
                className="rounded-full bg-[var(--opens-surface-2)] px-3 py-1 text-sm text-[var(--opens-accent-2)]"
              >
                {h.startsWith('#') ? h : `#${h}`}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function PostAquecimentoCard({ post, indice }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    const ok = await copiarTexto(post.copy || '')
    if (ok) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    }
  }
  return (
    <article className="flex flex-col rounded-xl border border-[var(--opens-border)] bg-[var(--opens-surface-2)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-md bg-[var(--opens-accent)]/20 px-2 py-0.5 text-xs font-bold text-[var(--opens-accent)]">
          Post {indice}
        </span>
        <button
          type="button"
          onClick={copiar}
          className="text-xs font-semibold text-[var(--opens-text-muted)] transition hover:text-[var(--opens-text)]"
        >
          {copiado ? '✓' : 'Copiar'}
        </button>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5 text-xs text-[var(--opens-text-muted)]">
        {post.quando && <span>🗓 {post.quando}</span>}
        {post.canal && <span>· {post.canal}</span>}
      </div>
      {post.objetivo && (
        <p className="mb-2 text-xs italic text-[var(--opens-accent-2)]">{post.objetivo}</p>
      )}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--opens-text)]">
        {post.copy}
      </p>
    </article>
  )
}

function Tag({ children }) {
  return (
    <span className="rounded-full bg-[var(--opens-surface-2)] px-3 py-1 text-sm text-[var(--opens-text-muted)]">
      {children}
    </span>
  )
}

function Bloco({ titulo, children }) {
  return (
    <section className="rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-6">
      <h3 className="mb-2 text-base font-bold">{titulo}</h3>
      <p className="text-sm leading-relaxed text-[var(--opens-text)]">{children}</p>
    </section>
  )
}

function CopyBloco({ titulo, texto }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    const ok = await copiarTexto(texto)
    if (ok) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    }
  }
  return (
    <section className="flex flex-col rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--opens-accent-2)]">
          {titulo}
        </h3>
        <button
          type="button"
          onClick={copiar}
          className="text-xs font-semibold text-[var(--opens-text-muted)] transition hover:text-[var(--opens-text)]"
        >
          {copiado ? '✓' : 'Copiar'}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--opens-text)]">{texto}</p>
    </section>
  )
}
