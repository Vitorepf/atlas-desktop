# Polish · Codex CLI Exact Replication

**Mission** — Replicar pixel-perfect o que Codex CLI faz BEM no codeblock + copy button, porque é a referência premium do mercado (terminal AI). Atlas atual está "amador". Este doc é o manual de execução.

**Inputs**
- `screenshots/atlas-ai-amador-76.png` — Codex CLI codeblock (REFERÊNCIA premium)
- `screenshots/atlas-ai-amador-77.png` — Atlas codeblock atual (amador, "TEXTO" + "copiar" form button)
- `screenshots/atlas-ai-current-deploy-79.png` — Atlas full screen contexto

**Honestidade** — Não tenho acesso à árvore CSS do Codex CLI nem ao Inspector deles. Todos os valores HEX, dimensões em px e font-sizes são **inferência visual a olho** a partir do screenshot #76 (1632×488 logical), calibrados contra o sistema de tokens `--cc-*` já existente no Atlas (`/Users/vitorepf/develop/Atlas/atlas-desktop/apps/desktop/src/surfaces/cartografia/styles/20-apple-pro-polish.css`). Marco com `≈` onde é palpite e `✓ canon` onde já tem token Atlas pronto.

---

## 1. Comparação lado-a-lado

| Elemento | Codex CLI (faz BEM ✓) | Atlas atual (faz MAL ✗) | Veredito |
|---|---|---|---|
| **Lang label** | `text` lowercase, mono pequeno, faint grey, sem letter-spacing | `TEXTO` UPPERCASE tracked, parece tag brutalista | Codex profissional · Atlas amador |
| **Copy control** | Ícone SVG only (16×16), zero border, zero bg, color faint | Botão `copiar` em texto com border visível, parece campo de formulário | Codex discreto · Atlas formal |
| **Insert control** | Ícone seta `→` (insert into chat) ao lado do copy | NÃO EXISTE no Atlas | Codex completo · Atlas falta |
| **Header divider** | INVISÍVEL ou ultra-faint (`rgba(...,0.02)` ou menos) | Hairline `rgba(233,238,242,0.04)` ainda visível, fragmenta o bloco | Codex unificado · Atlas fragmentado |
| **Header padding** | Generoso vertical (≈10-12px), igual em cima e embaixo | `7px 10px 6px 14px` — apertado, assimétrico | Codex respira · Atlas espremido |
| **Code body** | Branco-creme mono limpo, line-height ≈1.6, padding generoso (≈14-18px) | OK, mas line-height 1.55 pode subir +0.05 | Codex respira mais |
| **Border ao redor** | Quase invisível, `rgba(255,255,255,0.04)` ou menos | `rgba(233, 238, 242, 0.05)` — OK, mesma régua | empate |
| **Border-radius** | ≈8px (curva visível mas contida) | `6px` (Linear discipline) | Codex mais arredondado, mas 6px é canon Atlas — manter |
| **Container background** | `#1f1f1f` neutro (NÃO slate) | `#15212a` slate sunken (canon Atlas) | Atlas mantém canon. NÃO copiar o neutro do Codex aqui |

**Conclusão executiva** — Atlas NÃO precisa virar Codex em background (slate teal é canon Don Corleone, intocável). Atlas precisa copiar **3 coisas específicas**:

1. **Lang label** → lowercase mono faint, sem caps, sem tracking exagerado
2. **Copy button** → ícone-only ghost, zero border, zero bg em rest
3. **Insert-into-chat icon** → adicionar seta `→` ao lado do copy

---

## 2. Codeblock · anatomia completa (Codex spec)

```
┌─────────────────────────────────────────────────────────────────┐
│  text                                              →     ⧉      │   ← header faint, padding 12px 14px
│                                                                  │   ← ZERO divider visible (ou 0.02 alpha máx)
│  Input livre do humano                                           │
│            ↓                                                     │   ← body padding 14px 16px
│  Atlas Intent Router                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Tokén | Valor estimado | Origem |
|---|---|---|
| Container `background` | `#1f1f1f` (Codex) → `#15212a` ✓ canon (Atlas mantém) | inferência + `--cc-surface-sunken` |
| Container `border` | `1px solid rgba(255,255,255,0.04)` ≈ | inferência visual |
| Container `border-radius` | `8px` Codex · `6px` ✓ Atlas mantém | Linear discipline 2/4/6 |
| Container `margin-y` | `16px` (mais aerado que `14px` atual) | inferência |
| Header `padding` | `12px 14px` (vs atual `7px 10px 6px 14px`) | inferência |
| Header divider | **NENHUM** (remover `border-bottom`) | crítico premium |
| Header `gap` (entre lang e controls) | `auto` (space-between, mantém) | atual está OK |
| Header height efetivo | `≈40px` | inferência |
| Body `padding` | `14px 16px` ✓ próximo do atual | inferência |
| Body `font-size` | `12.5px` ✓ canon Atlas (não mexer) | tokens existentes |
| Body `line-height` | `1.6` (subir de 1.55) | inferência |
| Body `font-family` | mono ✓ canon Atlas | `--cc-font-mono` |

---

## 3. Copy button · anatomia (Codex spec)

```
   ⧉           ← 16x16 SVG, stroke 1.5, faint color
                ← zero padding visible, zero border, zero bg
                ← hover: color sobe pra strong, sem bg pulse
```

| Token | Valor estimado | Notas |
|---|---|---|
| Button `width × height` | `24px × 24px` ✓ atual OK (clickable target HIG) | manter atual |
| Button `background` REST | `transparent` ✓ atual OK | crítico premium |
| Button `border` | `none` ✓ atual OK | crítico premium |
| Button `padding` | `0` ✓ atual OK | manter |
| Icon `viewBox` | `0 0 16 16` (Codex usa 16, Atlas usa 14 — subir pra 16) | inferência |
| Icon `width × height` | `16px × 16px` (Codex maior que Atlas 13px) | inferência |
| Icon `stroke-width` | `1.5` (Codex mais "fineliner" que Atlas 1.45) | inferência |
| Icon `color` REST | `var(--cc-text-faint)` ≈ `#677482` ✓ canon Atlas | manter token |
| Icon `color` HOVER | `var(--cc-text-strong)` ≈ `#f0f4f7` ✓ canon | manter |
| Hover `background` | **REMOVER** o `rgba(233,238,242,0.05)` atual — Codex não tem | crítico premium |
| Focus ring | `1px var(--cc-accent)` ✓ atual OK | manter accessibility |
| Copied state color | `var(--cc-accent)` ✓ atual OK | manter |
| Gap entre insert→ e copy⧉ | `2px` (encostados quase, Codex faz isso) | inferência |

**Decisão crítica do hover** — Atlas atual pinta um `background` no hover do copy. **Codex não pinta**. Hover do Codex muda só a cor do stroke. Isso é o que separa "form button" de "premium ghost icon".

---

## 4. Insert-into-chat icon · adicionar do zero

Codex CLI tem **2 ícones** no top-right: seta `→` (insert into chat) + copy `⧉`. Atlas só tem copy.

**Recomendação** — Adicionar o insert icon mas **sem fingir funcionalidade**. Opções honestas:

- **Opção A · Aspirar** — Adicionar visualmente mas com `disabled` + tooltip "em breve". Garante paridade visual sem mentir.
- **Opção B · Cortar feature** — Só implementar quando tiver caso de uso real (insert code from message → composer). Mantém honestidade.

Sugestão: **Opção B agora, Opção A quando feature for priorizada**. Doc o caso aqui pra não esquecer.

Quando implementar, ícone Codex tem essa forma (estimado):

```svg
<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3.5 8.5 L10.5 3.5 L10.5 6.5 L13 6.5 L13 10.5 L10.5 10.5 L10.5 13.5 Z" />
</svg>
```

(Inferência grosseira — seta curvada apontando pra topo-direita ou similar; exatidão pixel-perfect exigiria reverse-engineer do bundle do Codex.)

---

## 5. Code body · anatomia

| Token | Atual Atlas | Codex (inferência) | Recomendação |
|---|---|---|---|
| `font-family` | `var(--cc-font-mono)` | mono OS (likely `SF Mono` / `Menlo`) | manter canon |
| `font-size` | `12.5px` | `≈13px` | subir pra `13px` (Codex respira mais) |
| `line-height` | `1.55` | `≈1.6` | subir pra `1.6` |
| `padding` | `12px 14px` | `≈14px 16px` | subir pra `14px 16px` |
| `color` | `var(--cc-text)` ≈ `#d6dde2` | `≈#e8e8e8` | manter canon Atlas (Don Corleone slate, não Codex neutro) |
| `overflow-x` | `auto` ✓ | `auto` ✓ | manter |

---

## 6. Recipes CSS · prontos pra colar em `atlas-ai.css`

**Localização** — `/Users/vitorepf/develop/Atlas/atlas-desktop/apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` linhas 2336-2417. Substituir o bloco inteiro `===== CODE BLOCKS · Linear/Stripe school =====`.

```css
/* ===== CODE BLOCKS · Codex CLI school =====
   Container slate sunken canon Atlas (NÃO copiar neutro Codex — Don Corleone
   slate é intocável). Header SEM divider (premium move). Lang label lowercase
   mono faint. Copy button SVG-only ghost, zero border, zero bg em rest. Hover
   muda só cor, sem pulse de background. */
.atlas-ai-md-codeblock {
  background: var(--cc-surface-sunken);              /* #15212a · canon */
  border: 1px solid var(--cc-border-soft);           /* rgba(233,238,242,0.05) · ✓ */
  border-radius: 6px;                                 /* Linear discipline · ✓ */
  overflow: hidden;
  margin: 16px 0;                                     /* +2px vs atual 14px · respiro Codex */
}

.atlas-ai-md-codeblock-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;                                 /* simétrico · Codex move */
  background: transparent;
  border-bottom: none;                                /* CRÍTICO · remover divider */
}

.atlas-ai-md-codeblock-lang {
  font-family: var(--cc-font-mono);
  font-size: 11px;                                    /* faint label, não tag */
  text-transform: lowercase;                          /* CRÍTICO · não UPPERCASE */
  letter-spacing: 0;                                  /* CRÍTICO · zero tracking */
  color: var(--cc-text-faint);                        /* #677482 · faint correto */
  font-variation-settings: 'wght' 450;                /* leve, não bold */
}

/* Container dos controls (insert + copy) — flex pra gap controlado */
.atlas-ai-md-codeblock-controls {
  display: inline-flex;
  align-items: center;
  gap: 2px;                                            /* Codex encosta quase · íntimo */
}

/* Copy button · Codex CLI school: SVG-only ghost, zero feedback de bg em rest E hover.
   Único feedback no hover é cor do stroke subir pra strong. Isso separa "form button"
   amador de "premium ghost icon" Codex. */
.atlas-ai-md-codeblock-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 0;
  color: var(--cc-text-faint);
  cursor: pointer;
  transition: color 180ms var(--cc-ease-out);
}

.atlas-ai-md-codeblock-copy:hover {
  color: var(--cc-text-strong);
  /* CRÍTICO · ZERO background change · Codex não pinta hover */
}

.atlas-ai-md-codeblock-copy.is-copied {
  color: var(--cc-accent);                            /* d4a85a · gold canon */
}

/* Focus ring · accessibility HIG · só visível em keyboard nav */
.atlas-ai-md-codeblock-copy:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--cc-accent-border);      /* rgba(212,168,90,0.34) */
}

/* Body · respira mais que atual */
.atlas-ai-md-codeblock-body pre,
.atlas-ai-md-codeblock-fallback {
  margin: 0;
  padding: 14px 16px;                                  /* +2px x e y vs atual */
  font-family: var(--cc-font-mono);
  font-size: 13px;                                     /* +0.5px vs atual 12.5 */
  line-height: 1.6;                                    /* +0.05 vs atual 1.55 */
  overflow-x: auto;
  background: transparent !important;
  color: var(--cc-text);
}

.atlas-ai-md-codeblock-body pre code,
.atlas-ai-md-codeblock-fallback code {
  font-family: inherit;
  font-size: inherit;
  background: transparent;
  border: none;
  padding: 0;
  color: inherit;
}
```

---

## 7. JSX adjustments · `AtlasAiMessageBody.tsx`

**Localização** — `/Users/vitorepf/develop/Atlas/atlas-desktop/apps/desktop/src/surfaces/atlas-ai/components/AtlasAiMessageBody.tsx` linhas 127-159 (função `CodeBlock`).

### 7.1 Trocar texto do lang label

Codex usa `text` em vez de `texto`. Atlas é PT-BR canon → manter `texto` é correto. Decisão: **manter `texto`** (Don Corleone fala PT). Crítica do lowercase já está aplicada via CSS, não precisa mudar JSX.

### 7.2 SVG icons · subir viewBox 14→16, stroke 1.45→1.5

```tsx
{copied ? (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 8 6.5 11.5 13 5" />
  </svg>
) : (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5.5" y="4" width="8.5" height="9.5" rx="1.4" />
    <path d="M10.5 4 V3 a1.3 1.3 0 0 0 -1.3 -1.3 H3.5 a1.3 1.3 0 0 0 -1.3 1.3 V10.5" />
  </svg>
)}
```

### 7.3 (Opcional · futuro) Wrap controls num container

Se decidir adicionar insert→ icon depois, JSX precisa virar:

```tsx
<header className="atlas-ai-md-codeblock-header">
  <span className="atlas-ai-md-codeblock-lang">{lang ?? 'texto'}</span>
  <div className="atlas-ai-md-codeblock-controls">
    {/* future: insert-into-chat button */}
    <button
      type="button"
      className={`atlas-ai-md-codeblock-copy${copied ? ' is-copied' : ''}`}
      onClick={handleCopy}
      aria-label={copied ? 'Copiado' : 'Copiar bloco de código'}
      title={copied ? 'Copiado' : 'Copiar'}
    >
      {/* SVG 16x16 (ver 7.2) */}
    </button>
  </div>
</header>
```

Adicionar a classe `.atlas-ai-md-codeblock-controls` (já está no CSS recipe acima, mesmo sem JSX usar agora — fica latente).

---

## 8. Checklist execução (ordem)

1. [ ] **CSS** · Substituir `===== CODE BLOCKS · Linear/Stripe school =====` (atlas-ai.css L2336-2417) pelo bloco da seção 6
2. [ ] **JSX** · Atualizar SVGs em `CodeBlock` (AtlasAiMessageBody.tsx L139-147) com viewBox 16 + stroke 1.5 (seção 7.2)
3. [ ] **Build verde** · `npm run build` no `atlas-desktop`. Inspecionar `apps/desktop/dist/` antes de pedir restart (canon `feedback_atlas_tauri_build_pipeline.md`)
4. [ ] **Visual check** · Comparar screenshot novo vs `screenshots/atlas-ai-amador-76.png` (Codex referência). Diferenças aceitas: slate vs neutro (canon Don Corleone). Diferenças NÃO aceitas: divider visível, lang UPPERCASE, hover com background
5. [ ] **(Opcional)** Insert→ icon — só implementar quando feature insert-from-message-to-composer estiver priorizada

---

## 9. O que NÃO copiar do Codex

Lista honesta dos lugares onde Codex tá certo pra Codex mas erradinho pra Atlas:

- **Background neutro `#1f1f1f`** — Codex é OS-terminal-agnóstico, neutro funciona. Atlas é Don Corciência slate teal, intocável.
- **Border-radius `8px`** — Codex levemente mais arredondado, mas `6px` é Linear discipline canon Atlas.
- **Tipografia `text` em inglês** — Atlas fala PT-BR (`texto`).
- **2 controls top-right por default** — Codex tem use case (insert into next prompt). Atlas só precisa quando tiver feature real, senão é teatro.

---

## 10. Honesto sobre limites desta análise

- Não rodei Codex CLI localmente nem inspetei o DOM/CSS. Tudo é leitura visual do PNG fornecido.
- Valores HEX e px são **inferência calibrada**, não medição exata. Margem de erro ±1-2px / ±5% alpha.
- Tipografia exata do Codex (mono OS-dependent) não é replicável 1:1 — Atlas usa `--cc-font-mono` token canon, que cobre o equivalente.
- Insert→ icon path SVG é palpite grosseiro; antes de implementar, capturar screenshot fresh do Codex e re-traçar.

Sources:
- [Features – Codex CLI | OpenAI Developers](https://developers.openai.com/codex/cli/features)
- [CLI – Codex | OpenAI Developers](https://developers.openai.com/codex/cli)
- [Introducing upgrades to Codex | OpenAI](https://openai.com/index/introducing-upgrades-to-codex/)
