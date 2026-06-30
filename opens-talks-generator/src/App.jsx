import { useEffect, useState } from 'react'
import ThemeGenerator from './components/ThemeGenerator.jsx'
import ElgaTrends from './components/ElgaTrends.jsx'
import EpisodeBuilder from './components/EpisodeBuilder.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import GrowthModal from './components/GrowthModal.jsx'
import { Button } from './components/ui.jsx'
import { getStatus } from './lib/config.js'
import { sessaoGrowth, aoMudarAuthGrowth } from './lib/growth.js'

// App raiz — alterna entre os modos Opens Talks (mercado) e ELGA (clientes),
// e abre a Tela 2 (episódio). Configuração da Anthropic e conexão ao Growth.
export default function App() {
  const [modo, setModo] = useState('opens') // 'opens' | 'elga'
  const [tela, setTela] = useState('lista') // 'lista' | 'episodio'
  const [temaSelecionado, setTemaSelecionado] = useState(null)
  const [contextoGeracao, setContextoGeracao] = useState(null)

  const [status, setStatus] = useState(null) // chave Anthropic
  const [showSettings, setShowSettings] = useState(false)

  const [growthSession, setGrowthSession] = useState(null)
  const [showGrowth, setShowGrowth] = useState(false)

  async function atualizarStatus() {
    try {
      const s = await getStatus()
      setStatus(s)
      return s
    } catch {
      setStatus({ hasKey: false, source: null })
      return { hasKey: false }
    }
  }

  async function atualizarGrowth() {
    const s = await sessaoGrowth()
    setGrowthSession(s)
    return s
  }

  useEffect(() => {
    atualizarStatus().then((s) => {
      if (!s?.hasKey) setShowSettings(true)
    })
    atualizarGrowth()
    // mantém a sessão do Growth em dia (refresh/expiração)
    const unsub = aoMudarAuthGrowth((session) => setGrowthSession(session))
    return unsub
  }, [])

  function abrirEpisodio(tema, contexto) {
    setTemaSelecionado(tema)
    setContextoGeracao(contexto)
    setTela('episodio')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function voltarParaLista() {
    setTela('lista')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function trocarModo(novo) {
    setModo(novo)
    setTela('lista')
  }

  const semChave = status && !status.hasKey

  return (
    <div className="min-h-full">
      <header className="border-b border-[var(--opens-border)] bg-[var(--opens-surface)]/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
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

          <div className="flex items-center gap-3">
            {/* Conexão Growth */}
            <button
              type="button"
              onClick={() => setShowGrowth(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--opens-border)] bg-[var(--opens-surface-2)] px-3 py-2 text-sm font-medium text-[var(--opens-text)] transition hover:border-[var(--opens-accent)]"
            >
              <span className={`h-2 w-2 rounded-full ${growthSession ? 'bg-[var(--opens-accent-2)]' : 'bg-[var(--opens-text-muted)]'}`} />
              Growth
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-[var(--opens-border)] bg-[var(--opens-surface-2)] px-3 py-2 text-sm font-medium text-[var(--opens-text)] transition hover:border-[var(--opens-accent)]"
            >
              ⚙ Configuração
            </button>
          </div>
        </div>

        {/* Seletor de modo */}
        <div className="mx-auto max-w-5xl px-4 pb-4 sm:px-6">
          <div className="inline-flex rounded-lg border border-[var(--opens-border)] bg-[var(--opens-surface-2)] p-1">
            <ModeButton ativo={modo === 'opens'} onClick={() => trocarModo('opens')}>
              Opens Talks · mercado
            </ModeButton>
            <ModeButton ativo={modo === 'elga'} onClick={() => trocarModo('elga')}>
              ELGA · clientes
            </ModeButton>
          </div>
        </div>
      </header>

      {semChave && (
        <div className="border-b border-[var(--opens-danger)]/40 bg-[var(--opens-danger)]/10">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm text-[var(--opens-text)]">
              Para gerar conteúdo, configure sua chave da Anthropic.
            </p>
            <Button onClick={() => setShowSettings(true)}>Configurar agora</Button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {tela === 'episodio' ? (
          <EpisodeBuilder
            tema={temaSelecionado}
            contextoGeracao={contextoGeracao}
            onVoltar={voltarParaLista}
          />
        ) : modo === 'opens' ? (
          <ThemeGenerator onMontarEpisodio={abrirEpisodio} />
        ) : (
          <ElgaTrends
            growthSession={growthSession}
            onConnectGrowth={() => setShowGrowth(true)}
            onMontarEpisodio={abrirEpisodio}
          />
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-[var(--opens-text-muted)] sm:px-6">
        Gerado via Claude API (claude-sonnet-4-6) · chave no servidor · dados do Growth via Supabase (RLS).
      </footer>

      {showSettings && (
        <SettingsModal status={status} onClose={() => setShowSettings(false)} onChanged={atualizarStatus} />
      )}
      {showGrowth && (
        <GrowthModal
          session={growthSession}
          onClose={() => setShowGrowth(false)}
          onChanged={atualizarGrowth}
        />
      )}
    </div>
  )
}

function ModeButton({ ativo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
        ativo
          ? 'bg-[var(--opens-accent)] text-white'
          : 'text-[var(--opens-text-muted)] hover:text-[var(--opens-text)]'
      }`}
    >
      {children}
    </button>
  )
}
