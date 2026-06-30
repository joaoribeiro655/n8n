import { useState } from 'react'
import { Button, Spinner, ErrorBanner } from './ui.jsx'
import { entrarGrowth, sairGrowth } from '../lib/growth.js'

// Modal de conexão com o Growth (login Supabase por e-mail/senha).
// `session` = sessão atual (ou null). `onChanged` é chamado após login/logout.
export default function GrowthModal({ session, onClose, onChanged }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')

  const conectado = Boolean(session)
  const usuario = session?.user?.email || ''

  async function handleEntrar() {
    setErro('')
    setEntrando(true)
    try {
      await entrarGrowth(email.trim(), senha)
      setSenha('')
      await onChanged()
    } catch (e) {
      setErro(e.message)
    } finally {
      setEntrando(false)
    }
  }

  async function handleSair() {
    setErro('')
    try {
      await sairGrowth()
      await onChanged()
    } catch (e) {
      setErro(e.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Conectar ao Growth</h2>
            <p className="mt-1 text-sm text-[var(--opens-text-muted)]">
              Plataforma de dados da Opens — entre com sua conta do Growth.
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

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--opens-border)] bg-[var(--opens-surface-2)] px-3 py-2.5 text-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${conectado ? 'bg-[var(--opens-accent-2)]' : 'bg-[var(--opens-danger)]'}`} />
          {conectado ? (
            <span>
              Conectado<span className="text-[var(--opens-text-muted)]"> · {usuario}</span>
            </span>
          ) : (
            <span className="text-[var(--opens-text-muted)]">Não conectado</span>
          )}
        </div>

        {!conectado ? (
          <>
            <label className="mt-5 flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--opens-text-muted)]">E-mail</span>
              <input
                type="email"
                value={email}
                autoComplete="username"
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-[var(--opens-border)] bg-[var(--opens-surface-2)] px-3 py-2.5 text-[var(--opens-text)] outline-none transition focus:border-[var(--opens-accent)]"
              />
            </label>
            <label className="mt-3 flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--opens-text-muted)]">Senha</span>
              <input
                type="password"
                value={senha}
                autoComplete="current-password"
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && email && senha && handleEntrar()}
                className="rounded-lg border border-[var(--opens-border)] bg-[var(--opens-surface-2)] px-3 py-2.5 text-[var(--opens-text)] outline-none transition focus:border-[var(--opens-accent)]"
              />
            </label>

            <div className="mt-4">
              <ErrorBanner message={erro} />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button onClick={handleEntrar} disabled={entrando || !email || !senha}>
                {entrando ? 'Entrando…' : 'Entrar'}
              </Button>
              {entrando && <Spinner label="" />}
            </div>
            <p className="mt-3 text-xs text-[var(--opens-text-muted)]">
              Seus dados são lidos respeitando o RLS do Growth — você só acessa o que sua conta tem permissão.
            </p>
          </>
        ) : (
          <div className="mt-5">
            <ErrorBanner message={erro} />
            <Button variant="secondary" onClick={handleSair}>
              Sair do Growth
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
