import { useState } from 'react'
import { Select, NumberSelect, Button, Spinner, ErrorBanner } from './ui.jsx'
import { gerarTemas } from '../lib/api.js'
import { OPENS_SYSTEM_CONTEXT, VERTICAIS, OBJETIVOS, NIVEIS_FUNIL } from '../lib/opensContext.js'

// TELA 1 — Gerador de Temas.
export default function ThemeGenerator({ onMontarEpisodio }) {
  // Estado apenas em useState (sem localStorage).
  const [vertical, setVertical] = useState(VERTICAIS[0])
  const [objetivo, setObjetivo] = useState(OBJETIVOS[0])
  const [nivelFunil, setNivelFunil] = useState(NIVEIS_FUNIL[0])
  const [quantidade, setQuantidade] = useState(4)

  const [temas, setTemas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ===== CHAMADA DE API: gera os temas =====
  async function handleGerar() {
    setLoading(true)
    setError('')
    try {
      const resultado = await gerarTemas(
        { vertical, objetivo, nivelFunil, quantidade },
        OPENS_SYSTEM_CONTEXT,
      )
      setTemas(resultado)
    } catch (err) {
      setError(err.message || 'Erro ao gerar temas.')
      setTemas([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-6">
        <h2 className="text-lg font-bold">Gerador de Temas</h2>
        <p className="mt-1 text-sm text-[var(--opens-text-muted)]">
          Defina os parâmetros e gere ideias de episódios para a série Opens Talks.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Vertical" value={vertical} onChange={setVertical} options={VERTICAIS} disabled={loading} />
          <Select label="Objetivo do webinar" value={objetivo} onChange={setObjetivo} options={OBJETIVOS} disabled={loading} />
          <Select label="Nível de funil" value={nivelFunil} onChange={setNivelFunil} options={NIVEIS_FUNIL} disabled={loading} />
          <NumberSelect label="Qtd. de temas" value={quantidade} onChange={setQuantidade} min={3} max={8} disabled={loading} />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button onClick={handleGerar} disabled={loading}>
            {loading ? 'Gerando temas…' : 'Gerar temas'}
          </Button>
          {loading && <Spinner label="Consultando a Opens Talks AI…" />}
        </div>

        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      </section>

      {temas.length > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--opens-text-muted)]">
            {temas.length} tema(s) gerado(s)
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {temas.map((tema, i) => (
              <TemaCard
                key={i}
                tema={tema}
                onMontar={() =>
                  onMontarEpisodio(tema, { vertical, objetivo, nivelFunil })
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function TemaCard({ tema, onMontar }) {
  return (
    <article className="flex flex-col rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-5 transition hover:border-[var(--opens-accent)]">
      <h4 className="text-base font-bold leading-snug">{tema.titulo}</h4>

      <dl className="mt-3 space-y-2 text-sm">
        <Linha rotulo="Ângulo" valor={tema.angulo} />
        <Linha rotulo="Dor principal" valor={tema.dor_principal} />
        <Linha rotulo="Público-alvo" valor={tema.publico_alvo} />
        <Linha rotulo="Gancho" valor={tema.gancho_de_atracao} />
      </dl>

      <div className="mt-auto pt-5">
        <Button variant="secondary" onClick={onMontar} className="w-full">
          Montar episódio →
        </Button>
      </div>
    </article>
  )
}

function Linha({ rotulo, valor }) {
  if (!valor) return null
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--opens-accent-2)]">
        {rotulo}
      </dt>
      <dd className="text-[var(--opens-text)]">{valor}</dd>
    </div>
  )
}
