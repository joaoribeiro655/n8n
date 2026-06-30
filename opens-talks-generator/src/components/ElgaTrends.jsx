import { useState } from 'react'
import { NumberSelect, Textarea, Button, Spinner, ErrorBanner } from './ui.jsx'
import TemaCard from './TemaCard.jsx'
import { puxarInsumosElga } from '../lib/growth.js'
import { gerarTemasElga } from '../lib/api.js'
import { OPENS_ELGA_CONTEXT } from '../lib/opensContext.js'

// MODO ELGA — temas "em alta" a partir dos dados reais de clientes (Growth).
// Requer login no Growth (a leitura respeita o RLS da conta).
export default function ElgaTrends({ growthSession, onConnectGrowth, onMontarEpisodio }) {
  const [quantidade, setQuantidade] = useState(5)
  const [foco, setFoco] = useState('')
  const [usarWeb, setUsarWeb] = useState(true)

  const [insumos, setInsumos] = useState(null)
  const [temas, setTemas] = useState([])
  const [loading, setLoading] = useState(false)
  const [etapa, setEtapa] = useState('')
  const [error, setError] = useState('')

  const conectado = Boolean(growthSession)

  // Contexto que viaja para a Tela 2 ao montar um episódio a partir de um tema ELGA.
  const contexto = {
    tema: foco,
    intuito: 'ELGA — conteúdo educativo para clientes da base, a partir dos assuntos reais do Growth',
    vertical: 'Genérico',
    objetivo: 'Ativação de base',
    nivelFunil: 'Fundo',
    webSearch: usarWeb,
  }

  // ===== Puxa os insumos do Growth e gera os temas via Claude =====
  async function handleGerar() {
    setLoading(true)
    setError('')
    setTemas([])
    try {
      setEtapa('Puxando assuntos dos clientes no Growth…')
      const ins = await puxarInsumosElga({})
      setInsumos(ins)

      if (!ins.topAssuntos.length) {
        const bloqueadas = ins.fontes.filter((f) => f.erro).map((f) => f.tabela)
        if (bloqueadas.length) {
          throw new Error(
            `Sem assuntos retornados. Acesso negado/indisponível em: ${bloqueadas.join(', ')} (verifique permissões no Growth).`,
          )
        }
        if (!ins.fontes.length) {
          const cands = (ins.tabelasCandidatas || []).slice(0, 10)
          throw new Error(
            cands.length
              ? `Encontrei tabelas de carteira/suporte/CS (${cands.join(', ')}), mas sem colunas de "assunto" reconhecidas. Me diga qual coluna usar e eu ajusto.`
              : 'Não encontrei tabelas de carteira/suporte/CS acessíveis à sua conta. Confirme suas permissões no Growth (ou me diga os nomes das tabelas).',
          )
        }
        throw new Error('Nenhum assunto encontrado na janela recente.')
      }

      setEtapa(usarWeb ? 'Gerando temas em alta (com busca na web)…' : 'Gerando temas em alta…')
      const resultado = await gerarTemasElga(
        { insumos: ins, quantidade, foco, webSearch: usarWeb },
        OPENS_ELGA_CONTEXT,
      )
      setTemas(resultado)
    } catch (err) {
      setError(err.message || 'Erro ao gerar temas do ELGA.')
    } finally {
      setLoading(false)
      setEtapa('')
    }
  }

  if (!conectado) {
    return (
      <div className="rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-8 text-center">
        <h2 className="text-lg font-bold">Temas em alta do ELGA</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--opens-text-muted)]">
          Para gerar temas a partir do que os clientes estão comentando e relatando, conecte-se ao
          Growth (a leitura respeita as permissões da sua conta).
        </p>
        <div className="mt-5">
          <Button onClick={onConnectGrowth}>Conectar ao Growth</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--opens-border)] bg-[var(--opens-surface)] p-6">
        <h2 className="text-lg font-bold">Temas em alta do ELGA</h2>
        <p className="mt-1 text-sm text-[var(--opens-text-muted)]">
          Puxa os assuntos recorrentes dos clientes no Growth (suporte, abordagens, atividades) e
          gera temas educativos sobre o que está pegando agora.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Textarea
            label="Foco adicional (opcional)"
            value={foco}
            onChange={setFoco}
            disabled={loading}
            rows={2}
            placeholder="Ex.: priorizar dúvidas sobre automação e relatórios"
          />
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
          Enriquecer com boas práticas atuais (busca na web)
        </label>

        <div className="mt-6 flex items-center gap-4">
          <Button onClick={handleGerar} disabled={loading}>
            {loading ? 'Gerando…' : 'Puxar do Growth e gerar temas'}
          </Button>
          {loading && <Spinner label={etapa} />}
        </div>

        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>

        {/* Transparência: mostra o que foi lido do Growth */}
        {insumos && (
          <div className="mt-5 rounded-xl border border-[var(--opens-border)] bg-[var(--opens-surface-2)] p-4">
            <p className="text-xs text-[var(--opens-text-muted)]">
              Janela: últimos {insumos.janelaDias} dias ·{' '}
              {insumos.fontes
                .map((f) => `${f.tabela}: ${f.erro ? 'sem acesso' : `${f.total} reg.`}`)
                .join('  ·  ')}
            </p>
            {insumos.topAssuntos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {insumos.topAssuntos.slice(0, 18).map((a, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-[var(--opens-surface)] px-3 py-1 text-xs text-[var(--opens-text)]"
                  >
                    {a.assunto} <span className="text-[var(--opens-accent-2)]">×{a.ocorrencias}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {temas.length > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--opens-text-muted)]">
            {temas.length} tema(s) em alta
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {temas.map((tema, i) => (
              <TemaCard key={i} tema={tema} onMontar={() => onMontarEpisodio(tema, contexto)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
