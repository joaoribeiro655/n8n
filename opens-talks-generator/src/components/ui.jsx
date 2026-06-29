// Primitivas de UI reutilizáveis (tema escuro, identidade Opens via CSS vars).

export function Select({ label, value, onChange, options, disabled }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--opens-text-muted)]">{label}</span>
      <select
        value={value}
        disabled={disabled}
        // Sem <form>: usamos onChange direto.
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--opens-border)] bg-[var(--opens-surface-2)] px-3 py-2.5 text-[var(--opens-text)] outline-none transition focus:border-[var(--opens-accent)] disabled:opacity-50"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}

export function NumberSelect({ label, value, onChange, min, max, disabled }) {
  const options = []
  for (let i = min; i <= max; i++) options.push(i)
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--opens-text-muted)]">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-[var(--opens-border)] bg-[var(--opens-surface-2)] px-3 py-2.5 text-[var(--opens-text)] outline-none transition focus:border-[var(--opens-accent)] disabled:opacity-50"
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Button({ children, onClick, variant = 'primary', disabled, className = '' }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
  const variants = {
    primary:
      'bg-[var(--opens-accent)] text-white hover:brightness-110 active:brightness-95',
    secondary:
      'border border-[var(--opens-border)] bg-[var(--opens-surface-2)] text-[var(--opens-text)] hover:border-[var(--opens-accent)]',
    ghost: 'text-[var(--opens-text-muted)] hover:text-[var(--opens-text)]',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Spinner({ label = 'Gerando…' }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[var(--opens-text-muted)]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--opens-border)] border-t-[var(--opens-accent)]" />
      {label}
    </span>
  )
}

export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-[var(--opens-danger)]/40 bg-[var(--opens-danger)]/10 px-4 py-3 text-sm text-[var(--opens-danger)]">
      {message}
    </div>
  )
}
