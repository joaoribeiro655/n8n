import { useState } from 'react'
import { Button, Spinner, ErrorBanner } from './ui.jsx'
import { salvarChave, removerChave, testarConexao } from '../lib/config.js'

// Tela (modal) de Configuração: cola a chave da Anthropic e usa o app
// sem mexer em arquivos. A chave vai para a memória do servidor, não fica
// no browser. `status` = { hasKey, source }; `onChanged` recarrega o status.
export default function SettingsModal({ status, onClose, onChanged }) {
  const [apiKey, setApiKey] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const conectado = Boolean(status?.hasKey)

  async function handleSalvar() {
    setErro('')
    setAviso('')
    setSalvando(true)
    try {
      await salvarChave(apiKey)
      setApiKey('')
      setAviso('Chave salva. Testando a conexão…')
      // Valida automaticamente após salvar.
      try {
        await testarConexao()
        setAviso('Tudo certo! Conexão validada — já pode gerar conteúdo.')
      } catch (e) {
        setAviso('')
        setErro(`Chave salva, mas o teste falhou: ${e.message}`)
      }
      await onChanged()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleTestar() {
    setErro('')
    setAviso('')
    setTestando(true)
    try {
      await testarConexao()
      setAviso('Conexão validada com sucesso.')
    } catch (e) {
      setErro(e.message)
    } finally {
      setTestando(false)
    }
  }

  async function handleRemover() {
    setErro('')
    setAviso('')
    try {
      await removerChave()
      await onChanged()
      setAviso('Chave removida.')
    } catch (e) {
      setErro(e.message)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Configuração</h2>
            <p className="mt-1 text-sm text-[var(--opens-text-muted)]">
              Cole sua chave da Anthropic para usar o gerador.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-[var(--opens-text-muted)] transition hover:text-[var(--opens-text)]"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Status atual */}
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--opens-border)] bg-[var(--opens-surface-2)] px-3 py-2.5 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              conectado ? 'bg-[var(--opens-accent-2)]' : 'bg-[var(--opens-danger)]'
            }`}
          />
          {conectado ? (
            <span>
              Conectado
              <span className="text-[var(--opens-text-muted)]">
                {' '}
                · chave via {status.source === 'env' ? 'arquivo .env' : 'configuração'}
              </span>
            </span>
          ) : (
            <span className="text-[var(--opens-text-muted)]">Sem chave configurada</span>
          )}
        </div>

        {/* Campo da chave */}
        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--opens-text-muted)]">
            Chave da API (sk-ant-…)
          </span>
          <input
            type="password"
            value={apiKey}
            placeholder="sk-ant-..."
            autoComplete="off"
            onChange={(e) => setApiKey(e.target.value)}
            className="rounded-lg border border-[var(--opens-border)] bg-[var(--opens-surface-2)] px-3 py-2.5 text-[var(--opens-text)] outline-none transition focus:border-[var(--opens-accent)]"
          />
          <span className="text-xs text-[var(--opens-text-muted)]">
            Pegue em console.anthropic.com → API Keys. A chave fica só na memória do
            servidor — não é salva no navegador.
          </span>
        </label>

        <div className="mt-4 space-y-3">
          <ErrorBanner message={erro} />
          {aviso && (
            <p className="rounded-lg border border-[var(--opens-accent-2)]/30 bg-[var(--opens-accent-2)]/10 px-3 py-2 text-sm text-[var(--opens-accent-2)]">
              {aviso}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={handleSalvar} disabled={salvando || !apiKey}>
            {salvando ? 'Salvando…' : 'Salvar chave'}
          </Button>
          {conectado && (
            <Button variant="secondary" onClick={handleTestar} disabled={testando}>
              {testando ? 'Testando…' : 'Testar conexão'}
            </Button>
          )}
          {status?.source === 'runtime' && (
            <Button variant="ghost" onClick={handleRemover}>
              Remover
            </Button>
          )}
          {(salvando || testando) && <Spinner label="" />}
        </div>
      </div>
    </div>
  )
}
