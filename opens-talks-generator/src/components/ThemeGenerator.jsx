import { useState } from 'react'
import { Select, NumberSelect, Textarea, Button, Spinner, ErrorBanner } from './ui.jsx'
import { gerarTemas } from '../lib/api.js'
import { OPENS_SYSTEM_CONTEXT, VERTICAIS, OBJETIVOS, NIVEIS_FUNIL } from '../lib/opensContext.js'

// TELA 1 — Gerador de Temas.
export default function ThemeGenerator({ onMontarEpisodio }) {
  // Estado apenas em useState (sem localStorage).
  const [tema, setTema] = useState('') // descrição livre do tema (opcional)
  const [intuito, setIntuito] = useState('') // intuito/objetivo da live, em texto livre
  const [vertical, setVertical] = useState(VERTICAIS[0])
  const [objetivo, setObjetivo] = useState(OBJETIVOS[0])
  const [nivelFunil, setNivelFunil] = useState(NIVEIS_FUNIL[0])
  const [quantidade, setQuantidade] = useState(4)
  const [usarWeb, setUsarWeb] = useState(true) // basear em notícias atuais (web)

  const [temas, setTemas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Contexto que viaja junto para a Tela 2 (a API não tem memória).
  const contexto = { tema, intuito, vertical, objetivo, nivelFunil, webSearch: usarWeb }

  // ===== CHAMADA DE API: gera os temas =====
  async function handleGerar() {
    setLoading(true)
    setError('')
    try {
      const resultado = await gerarTemas(
        { tema, intuito, vertical, objetivo, nivelFunil, quantidade, webSearch: usarWeb },
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
          Escreva, com suas palavras, o tema e o intuito da live. Os campos abaixo
          ajudam a refinar — gere quantas vezes quiser.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Textarea
            label="Tema (mais ou menos)"
            value={tema}
            onChange={setTema}
            disabled={loading}
            rows={3}
            placeholder="Ex.: como usar IA no WhatsApp para reduzir tempo de primeira resposta sem perder o toque humano"
          />
          <Textarea
            label="Intuito da live"
            value={intuito}
            onChange={setIntuito}
            disabled={loading}
            rows={3}
            placeholder="Ex.: gerar leads qualificados de clínicas e mostrar a Opens como referência em automação de atendimento"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Vertical" value={vertical} onChange={setVertical} options={VERTICAIS} disabled={loading} />
          <Select label="Objetivo do webinar" value={objetivo} onChange={setObjetivo} options={OBJETIVOS} disabled={loading} />
          <Select label="Nível de funil" value={nivelFunil} onChange={setNivelFunil} options={NIVEIS_FUNIL} disabled={loading} />
          <NumberSelect label="Qtd. de temas" value={quantidade} onChange={setQuantidade} min={3} max={8} disabled={loading} />
        </div>

        <label className="mt-5 flex w-fit cursor-pointer items-center gap-2.5 text-sm text-[var(--opens-text-muted)]">
          <input
            type="checkbox"
            checked={usarWeb}
            disabled={loading}
            onChange={(e) => setUsarWeb(e.target.checked)}
            className="h-4 w-4 accent-[var(--opens-accent)]"
          />
          Basear em notícias e tendências atuais (busca na web)
        </label>

        <div className="mt-6 flex items-center gap-4">
          <Button onClick={handleGerar} disabled={loading}>
            {loading ? 'Gerando temas…' : 'Gerar temas'}
          </Button>
          {loading && (
            <Spinner label={usarWeb ? 'Buscando o que está em pauta agora…' : 'Consultando a Opens Talks AI…'} />
          )}
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
                onMontar={() => onMontarEpisodio(tema, contexto)}
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

      {tema.contexto_atual && (
        <p className="mt-3 rounded-lg border border-[var(--opens-accent-2)]/30 bg-[var(--opens-accent-2)]/10 px-3 py-2 text-xs text-[var(--opens-accent-2)]">
          🗞 Em pauta agora: {tema.contexto_atual}
        </p>
      )}

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
