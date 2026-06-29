import { useState } from 'react'
import ThemeGenerator from './components/ThemeGenerator.jsx'
import EpisodeBuilder from './components/EpisodeBuilder.jsx'

// App raiz — controla a navegação entre Tela 1 (temas) e Tela 2 (episódio).
// Todo o estado fica em useState (sem localStorage).
export default function App() {
  const [tela, setTela] = useState('temas') // 'temas' | 'episodio'
  const [temaSelecionado, setTemaSelecionado] = useState(null)
  const [contextoGeracao, setContextoGeracao] = useState(null)

  function abrirEpisodio(tema, contexto) {
    setTemaSelecionado(tema)
    setContextoGeracao(contexto)
    setTela('episodio')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function voltarParaTemas() {
    setTela('temas')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-[var(--opens-border)] bg-[var(--opens-surface)]/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--opens-accent)]">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-[var(--opens-accent-2)]" />
            </div>
            <div>
              <h1 className="text-base font-extrabold leading-none">Opens Talks Generator</h1>
              <p className="mt-0.5 text-xs text-[var(--opens-text-muted)]">
                Conversas sobre atendimento que vende
              </p>
            </div>
          </div>
          <span className="hidden text-xs text-[var(--opens-text-muted)] sm:inline">
            Opens · atendimento omnichannel B2B
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {tela === 'temas' && <ThemeGenerator onMontarEpisodio={abrirEpisodio} />}
        {tela === 'episodio' && (
          <EpisodeBuilder
            tema={temaSelecionado}
            contextoGeracao={contextoGeracao}
            onVoltar={voltarParaTemas}
          />
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-[var(--opens-text-muted)] sm:px-6">
        Gerado via Claude API (claude-sonnet-4-6) · a chave fica somente no servidor.
      </footer>
    </div>
  )
}
