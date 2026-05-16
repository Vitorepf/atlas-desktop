/**
 * Atlas AI · Rich Artifact · Tree (decision tree)
 *
 * Árvore de decisão recursive: cada node é OU `question` com yes/no branches,
 * OU `answer` terminal.
 *
 * Source format (JSON dentro de ```atlas:tree):
 *   {
 *     "title": "Como rotear?",  // opcional
 *     "root": {
 *       "question": "Tem workspace?",
 *       "yes": {
 *         "question": "Mode é programming?",
 *         "yes": { "answer": "Atlas Code" },
 *         "no": { "answer": "Atlas AI Programming" }
 *       },
 *       "no": { "answer": "Atlas AI General" }
 *     }
 *   }
 *
 * DNA: hairline gradient connectors, question peso 540 ink-strong, answer
 * peso 460 + bg surface-raised + accent stripe, yes-path accent gold,
 * no-path ink-faint.
 */
import type { ReactElement } from 'react'

interface TreeAnswer { answer: string }
interface TreeQuestion {
  question: string
  yes: TreeNode
  no: TreeNode
}
type TreeNode = TreeQuestion | TreeAnswer

interface TreeData {
  title?: string
  root?: TreeNode
}

function isAnswer(n: TreeNode | undefined): n is TreeAnswer {
  return !!n && typeof (n as TreeAnswer).answer === 'string'
}
function isQuestion(n: TreeNode | undefined): n is TreeQuestion {
  return !!n && typeof (n as TreeQuestion).question === 'string'
}

function isTreeData(data: unknown): data is TreeData {
  if (!data || typeof data !== 'object') return false
  return true
}

function renderNode(node: TreeNode, branch: 'root' | 'yes' | 'no', depth: number): ReactElement {
  if (isAnswer(node)) {
    return (
      <div className={`atlas-ai-tree-leaf atlas-ai-tree-leaf-${branch}`}>
        <span className="atlas-ai-tree-leaf-label">{node.answer}</span>
      </div>
    )
  }
  if (isQuestion(node)) {
    return (
      <div className={`atlas-ai-tree-question atlas-ai-tree-question-${branch}`}>
        <p className="atlas-ai-tree-question-text">{node.question}</p>
        <div className="atlas-ai-tree-branches">
          <div className="atlas-ai-tree-branch atlas-ai-tree-branch-yes">
            <span className="atlas-ai-tree-branch-label">sim</span>
            {renderNode(node.yes, 'yes', depth + 1)}
          </div>
          <div className="atlas-ai-tree-branch atlas-ai-tree-branch-no">
            <span className="atlas-ai-tree-branch-label">não</span>
            {renderNode(node.no, 'no', depth + 1)}
          </div>
        </div>
      </div>
    )
  }
  return <div className="atlas-ai-tree-leaf">…</div>
}

export function AtlasAiTree({ data }: { data: unknown }): ReactElement {
  if (!isTreeData(data) || !data.root) {
    return (
      <div className="atlas-ai-rich-artifact atlas-ai-rich-artifact-error">
        tree malformado · esperado {'{ root: { question | answer } }'}
      </div>
    )
  }
  return (
    <article className="atlas-ai-rich-artifact atlas-ai-rich-artifact-tree" aria-label="Árvore de decisão">
      {data.title ? (
        <header className="atlas-ai-rich-artifact-head">
          <span className="atlas-ai-rich-artifact-kind">decision</span>
          <span className="atlas-ai-rich-artifact-title">{data.title}</span>
        </header>
      ) : null}
      <div className="atlas-ai-tree-body">
        {renderNode(data.root, 'root', 0)}
      </div>
    </article>
  )
}
