import { useEffect, useState } from 'react'
import ThemeGenerator from './components/ThemeGenerator.jsx'
import EpisodeBuilder from './components/EpisodeBuilder.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { Button } from './components/ui.jsx'
import { getStatus } from './lib/config.js'

// App raiz — controla a navegação entre Tela 1 (temas) e Tela 2 (episódio)
// e a tela de Configuração (chave da Anthropic). Estado só em useState.
export default function App() {
  const [tela, setTela] = useState('temas') // 'temas' | 'episodio'
  const [temaSelecionado, setTemaSelecionado] = useState(null)
  const [contextoGeracao, setContextoGeracao] = useState(null)

  const [status, setStatus] = useState(null) // { hasKey, source } | null
  const [showSettings, setShowSettings] = useState(false)

  // Consulta o status da chave no servidor (sem nunca receber a chave em si).
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

  // Ao abrir o app: checa o status. Se não houver chave, abre a Configuração.
  useEffect(() => {
    atualizarStatus().then((s) => {
      if (!s?.hasKey) setShowSettings(true)
    })
  }, [])

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

  const semChave = status && !status.hasKey

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

          <div className="flex items-center gap-3">
            {/* Indicador de status da chave */}
            {status && (
              <span className="hidden items-center gap-1.5 text-xs text-[var(--opens-text-muted)] sm:inline-flex">
                <span
                  className={`h-2 w-2 rounded-full ${
                    status.hasKey ? 'bg-[var(--opens-accent-2)]' : 'bg-[var(--opens-danger)]'
                  }`}
                />
                {status.hasKey ? 'conectado' : 'sem chave'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-[var(--opens-border)] bg-[var(--opens-surface-2)] px-3 py-2 text-sm font-medium text-[var(--opens-text)] transition hover:border-[var(--opens-accent)]"
            >
              ⚙ Configuração
            </button>
          </div>
        </div>
      </header>

      {/* Banner quando ainda não há chave configurada */}
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

      {showSettings && (
        <SettingsModal
          status={status}
          onClose={() => setShowSettings(false)}
          onChanged={atualizarStatus}
        />
      )}
    </div>
  )
}
