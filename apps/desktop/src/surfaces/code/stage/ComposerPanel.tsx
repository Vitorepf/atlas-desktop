import { useMemo, useState } from 'react'

interface ComposerPanelProps {
  busy: boolean
  hasObra: boolean
  onSend: (text: string) => Promise<void>
}

/**
 * Atlas Code Obra Command Center v1 · Chat com papel (7 kinds).
 *
 * Amplia a classificação v2 com `restriction` (regra que NÃO pode quebrar) e
 * `acceptance_criterion` (critério de aceite). Mostra ao operador qual será o
 * efeito esperado *antes* de enviar.
 *
 * A classificação é heurística e local; a fonte de verdade continua sendo o
 * backend quando ele processar o envio. O chip aqui é honestidade pré-envio:
 * o operador nunca envia mensagem solta sem saber se vira Definição/Comando/
 * Pergunta/Decisão/Restrição/Critério/Nota.
 */
type ChatMessageKind =
  | 'definition'
  | 'command'
  | 'question'
  | 'decision'
  | 'note'
  | 'restriction'
  | 'acceptance_criterion'

function classifyChatKind(text: string): ChatMessageKind {
  const t = text.trim().toLowerCase()
  if (t === '') return 'note'
  if (t.endsWith('?') || t.startsWith('como ') || t.startsWith('por que') || t.startsWith('o que') || t.startsWith('qual ')) {
    return 'question'
  }
  if (/^\/(forge|run|prepare|execute|review|rollback|approve|reject|fix-scope|refresh|wait|status)/.test(t)) {
    return 'command'
  }
  if (/^(aprov|reject|rejeit|rollback|aprovar|bloquear|autoriz|decis)/.test(t)) {
    return 'decision'
  }
  // Acceptance criterion BEFORE restriction so "deve passar" não cai em restriction.
  if (/(criterio de aceite|criterio:|acceptance|definition of done|dod[:\s]|deve passar|tem que (passar|funcionar))/.test(t)) {
    return 'acceptance_criterion'
  }
  if (/^(nao pode|não pode|nunca |proibid|forbid|jamais |sob nenhuma|cannot|restricao:|restrição:)/.test(t)
    || /(nao pode quebrar|não pode quebrar|invariant\s*:?|invariante:|regra que nao pode|regra que não pode)/.test(t)) {
    return 'restriction'
  }
  if (/(objetivo|regra de neg|criterio|criter|escopo|pode mexer|nao pode mexer|não pode mexer|definicao|definição|definir)/.test(t)) {
    return 'definition'
  }
  return 'note'
}

const KIND_LABEL: Record<ChatMessageKind, string> = {
  definition: 'Definição',
  command: 'Comando',
  question: 'Pergunta',
  decision: 'Decisão humana',
  note: 'Nota',
  restriction: 'Restrição',
  acceptance_criterion: 'Critério de aceite',
}

const KIND_EFFECT: Record<ChatMessageKind, string> = {
  definition: 'será salva e pode atualizar a Definição',
  command: 'será interpretada como comando do Forge',
  question: 'pergunta — não muda estado',
  decision: 'registrada como decisão humana auditável',
  note: 'será salva como nota desta Obra',
  restriction: 'registrada como invariante: regra que não pode quebrar',
  acceptance_criterion: 'registrada como critério de aceite da Obra',
}

export function ComposerPanel({ busy, hasObra, onSend }: ComposerPanelProps) {
  const [draft, setDraft] = useState('')
  const kind: ChatMessageKind = useMemo(() => classifyChatKind(draft), [draft])

  async function handleSend() {
    const text = draft.trim()
    if (!text || busy || !hasObra) return
    setDraft('')
    await onSend(text)
  }

  return (
    <div className="composer">
      <div className="composer-row">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder={
            hasObra
              ? 'conversa com o Atlas… cmd+enter envia'
              : 'cria uma obra acima primeiro · composer ativa quando obra existe'
          }
          disabled={!hasObra || busy}
        />
        <button
          className="send-btn"
          type="button"
          title="enviar (cmd+enter)"
          onClick={() => void handleSend()}
          disabled={!hasObra || busy || !draft.trim()}
        >
          ✦
        </button>
      </div>
      <div className="composer-meta">
        <div>
          {hasObra && draft.trim() !== '' ? (
            <span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '1px 6px',
                  marginRight: 6,
                  fontFamily: 'var(--mono)',
                  fontSize: 8.5,
                  letterSpacing: '1.1px',
                  textTransform: 'uppercase',
                  color: 'var(--bronze)',
                  border: '1px solid var(--bronze-soft)',
                  borderRadius: 2,
                }}
                title={`Papel detectado: ${KIND_LABEL[kind]} · ${KIND_EFFECT[kind]}`}
              >
                {KIND_LABEL[kind]}
              </span>
              <span style={{ color: 'var(--ink3)', fontStyle: 'italic' }}>{KIND_EFFECT[kind]}</span>
            </span>
          ) : (
            <span>∴ {busy ? 'enviando…' : hasObra ? 'composer ativo · cmd+enter envia' : 'aguardando obra'}</span>
          )}
        </div>
        <div>
          <kbd>cmd</kbd>+<kbd>enter</kbd> · <kbd>esc</kbd>
        </div>
      </div>
    </div>
  )
}
