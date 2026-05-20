import { useMemo, useState } from 'react'
import {
  AtlasUnifiedComposer,
  type AtlasUnifiedComposerSendPayload,
} from '../../../components/composer/AtlasUnifiedComposer'
import type { AtlasRichInputAttachmentsApi } from '../../../lib/rich-input'
import type { AtlasComputeEffortChoice } from '../../../lib/rich-input'
import { defaultTaskForMode, isTaskAllowedForMode } from '../../atlas-ai/contract'
import type { AtlasAiMode, AtlasAiProviderChoice, AtlasAiTask } from '../../atlas-ai/types'

export interface CodeComposerHints {
  mode: AtlasAiMode
  task: AtlasAiTask
  provider: AtlasAiProviderChoice
  computeEffort: AtlasComputeEffortChoice
}

interface ComposerPanelProps {
  busy: boolean
  hasObra: boolean
  onSend: (
    text: string,
    opts: {
      richInput: AtlasUnifiedComposerSendPayload['richInput']
      composerHints: CodeComposerHints
    },
  ) => Promise<void>
  attachments: AtlasRichInputAttachmentsApi
}

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

const OBRA_ALLOWED_MODES: readonly AtlasAiMode[] = [
  'auto',
  'programming',
  'operational',
  'research',
]

const OBRA_ALLOWED_PROGRAMMING_TASKS: readonly AtlasAiTask[] = [
  'dev',
  'debug',
  'review',
  'plan',
]

export function ComposerPanel({
  busy,
  hasObra,
  onSend,
  attachments,
}: ComposerPanelProps) {
  const [draft, setDraft] = useState('')
  const [mode, setModeRaw] = useState<AtlasAiMode>('auto')
  const [task, setTask] = useState<AtlasAiTask>('auto')
  const [provider, setProvider] = useState<AtlasAiProviderChoice>('auto')
  const [computeEffort, setComputeEffort] = useState<AtlasComputeEffortChoice>('auto')
  const kind = useMemo(() => classifyChatKind(draft), [draft])

  function setMode(next: AtlasAiMode) {
    setModeRaw(next)
    setTask((curr) => (isTaskAllowedForMode(curr, next) ? curr : defaultTaskForMode(next)))
  }

  async function handleSend(payload: AtlasUnifiedComposerSendPayload) {
    await onSend(payload.text, {
      richInput: payload.richInput,
      composerHints: {
        mode: payload.mode,
        task: payload.task,
        provider: payload.provider,
        computeEffort: payload.computeEffort,
      },
    })
  }

  return (
    <AtlasUnifiedComposer
      draft={draft}
      onChange={setDraft}
      mode={mode}
      onModeChange={setMode}
      task={task}
      onTaskChange={setTask}
      provider={provider}
      onProviderChange={setProvider}
      computeEffort={computeEffort}
      onComputeEffortChange={setComputeEffort}
      attachments={attachments}
      sending={busy}
      disabled={!hasObra}
      disabledReason="cria uma obra acima primeiro · composer ativa quando obra existe"
      allowedModes={OBRA_ALLOWED_MODES}
      allowedProgrammingTasks={OBRA_ALLOWED_PROGRAMMING_TASKS}
      modeOptionOverrides={{
        auto: {
          label: 'Auto (Obra/Forge)',
          description: 'mantém o fluxo da Obra; Atlas decide contexto e provider',
        },
        operational: {
          label: 'Operacional da Obra',
          description: 'diagnóstico, risco e próxima ação dentro do Forge',
        },
        research: {
          label: 'Pesquisa da Obra',
          description: 'investigação e evidência técnica sem trocar o flow',
        },
      }}
      onSend={handleSend}
      statusSlot={
        hasObra && draft.trim() !== '' ? (
          <span>
            <span
              style={{
                display: 'inline-block',
                padding: '1px 6px',
                marginRight: 6,
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 8.5,
                letterSpacing: 0,
                textTransform: 'none',
                color: 'var(--bronze)',
                border: '1px solid var(--bronze-soft)',
                borderRadius: 2,
              }}
              title={`Papel detectado: ${KIND_LABEL[kind]} · ${KIND_EFFECT[kind]}`}
            >
              {KIND_LABEL[kind]}
            </span>
            <span style={{ color: 'var(--ink3)', fontStyle: 'normal' }}>{KIND_EFFECT[kind]}</span>
          </span>
        ) : null
      }
    />
  )
}
