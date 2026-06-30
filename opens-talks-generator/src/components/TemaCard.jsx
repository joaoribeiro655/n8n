import { Button } from './ui.jsx'

// Card de um tema gerado (usado tanto no Opens Talks quanto no ELGA).
export default function TemaCard({ tema, onMontar }) {
  return (
    <article className="flex flex-col rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-5 transition hover:border-[var(--opens-accent)]">
      <h4 className="text-base font-bold leading-snug">{tema.titulo}</h4>

      {tema.contexto_atual && (
        <p className="mt-3 rounded-lg border border-[var(--opens-accent-2)]/30 bg-[var(--opens-accent-2)]/10 px-3 py-2 text-xs text-[var(--opens-accent-2)]">
          🗞 Em pauta agora: {tema.contexto_atual}
        </p>
      )}

      {tema.baseado_em && (
        <p className="mt-3 rounded-lg border border-[var(--opens-accent)]/30 bg-[var(--opens-accent)]/10 px-3 py-2 text-xs text-[var(--opens-text)]">
          📊 Dados do Growth: {tema.baseado_em}
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--opens-accent-2)]">{rotulo}</dt>
      <dd className="text-[var(--opens-text)]">{valor}</dd>
    </div>
  )
}
