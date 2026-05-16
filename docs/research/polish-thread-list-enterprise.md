# Polish · Thread List Enterprise Audit (Atlas AI · Left Rail)

> Auditoria especialista do left rail "Conversas" no screenshot `atlas-ai-current-deploy-79.png`.
> Comparado com Linear, Notion, Cursor, Mercury, Slack, Vercel — sidebars premium de referência 2026.
> Tom Don Corleone: peso silencioso, hierarquia firme, ZERO web design tropes.

**Escopo arquivos:**
- JSX: `apps/desktop/src/surfaces/atlas-ai/components/AtlasAiThreadList.tsx`
- CSS: `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` (linhas 396–579, 1872–2030)
- Tokens slate teal: `apps/desktop/src/surfaces/cartografia/styles/20-apple-pro-polish.css` (linhas 41–62)

---

## TL;DR · Scorecard

| Elemento                          | Nota atual | Após fix | Severidade |
|-----------------------------------|------------|----------|------------|
| 1. Header "Conversas" + "+ nova"  | 7.0/10     | 9.0/10   | low        |
| 2. Filter tabs (todas/geral/...)  | **5.5/10** | 8.5/10   | **high**   |
| 3. Refresh icon button (↻)        | **6.0/10** | 8.5/10   | medium     |
| 4. Eyebrow "PROJETOS"             | 7.5/10     | 9.0/10   | low        |
| 5. Folder header (atlas · 31)     | **6.5/10** | 9.0/10   | medium     |
| 6. Thread item · idle             | 7.5/10     | 9.0/10   | low        |
| 7. Thread item · **selected**     | **6.0/10** | 9.5/10   | **high**   |
| 8. Thread item · hover            | 7.0/10     | 8.5/10   | medium     |
| 9. Time formatting (2min/1h/...)  | **6.5/10** | 9.0/10   | medium     |
| 10. "Mostrar mais 26" link        | 7.5/10     | 8.5/10   | low        |
| 11. Density geral / vertical rhy. | **6.0/10** | 9.0/10   | **high**   |
| 12. Folder count badge ("31")     | **5.5/10** | 9.0/10   | medium     |

**3 prioridades P0** (impacto máximo / esforço baixo):
1. **Selected state robusto** — adicionar accent stripe esquerda 2px gold + weight title 580 (não só veil background)
2. **Filter tabs Linear-style** — descer ruído visual: tipografia sans menor + ::after underline gold no active, sem border box
3. **Density tightening** — row height 10px→8px padding + line-height firme + remover gap excessivo entre folder e thread

---

## Referências Premium Estudadas

| App        | Lição absorvida no fix                                                |
|------------|------------------------------------------------------------------------|
| **Linear** | UI refresh Mar/2026: "sidebars mais dim, conteúdo se destaca", alinhamento label/icon/button vertical+horizontal obsessivo. Filter tabs sem caixa border. |
| **Notion** | Inter 500 medium em labels de sidebar, 8px corner radius, clickable zone bem além do texto, 8px breathing horizontal. |
| **Cursor** | Hover reveals icons (pencil/trash) — actions latentes não vão na row idle. |
| **Mercury**| Light grey background-mode em selected, hairline em hover, NUNCA caixa pintada agressiva. |
| **Slack**  | Selected channel: border-radius pill com background sólido sutil + weight bump no nome. ZERO border-color contrastante. |
| **Vercel** | Resizable, collapsable, hierarquia consistente em todos níveis. Sub-itens com indent visual sutil (2px stripe esquerda, não tab). |

**Princípio sintetizado para Atlas:**
> Selected = peso (weight bump + accent stripe gold 2px à esquerda + veil de fundo). Hover = hairline border-soft + veil 4%. Idle = transparente puro. Folder count = mono small + tabular-nums, NÃO badge pill. Filter tabs = sublinhado gold no active, sem caixa.

---

## 1. Header "Conversas" + "+ nova"

**Nota:** 7.0/10 (após fix: 9.0/10)
**Severidade:** low

### Diagnóstico
- "Conversas" 13px peso 580 — ✓ correto, sans operacional firme.
- "+ nova" como `.atlas-ai-link` muted — ✓ ok, mas o "+" e "nova" estão grudados sem spacing, e o link fica visualmente fraco vs header. Em Linear o action é um icon button compacto, não um link texto.
- Falta micro-divider sutil abaixo do header — atualmente o filter row encosta direto, sem respiro arquitetônico.
- Padding lateral do header (0 4px) é menor que padding das thread rows (10px) — desalinhamento ótico.

### Fix CSS

```css
/* atlas-ai.css · linha ~406 */
.atlas-ai-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;            /* WAS: baseline → center para melhor alinhamento com botão */
  margin-bottom: 8px;             /* WAS: 12px → mais firme */
  padding: 0 6px 8px;             /* +bottom + hairline pseudo */
  position: relative;
}

.atlas-ai-history-header::after {
  content: '';
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 0;
  height: 1px;
  background: var(--cc-border-soft);
}

.atlas-ai-history-header h3 {
  font-family: var(--cc-font-sans);
  font-variation-settings: 'wght' 600;   /* WAS: 580 → 600 firme */
  font-size: 13px;
  letter-spacing: -0.005em;              /* tightening sutil */
  color: var(--cc-text-strong);
  margin: 0;
}

/* "+ nova" repensado como mini-action button */
.atlas-ai-history-header .atlas-ai-link {
  font-size: 11.5px;
  font-variation-settings: 'wght' 520;
  color: var(--cc-text-muted);
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;                              /* respiro entre + e nova */
  transition: color 160ms var(--cc-ease-out), background 160ms var(--cc-ease-out);
}

.atlas-ai-history-header .atlas-ai-link:hover {
  color: var(--cc-accent);
  background: var(--cc-accent-veil);
}
```

### Fix JSX (opcional · upgrade do "+ nova")

```tsx
<button
  type="button"
  className="atlas-ai-link"
  onClick={onNewThread}
  title="Compor sem thread ativa (cria uma nova ao enviar)"
>
  <span aria-hidden="true" style={{ fontSize: '12px', lineHeight: 1 }}>+</span>
  <span>nova</span>
</button>
```

---

## 2. Filter tabs (todas / geral / ops / dev)

**Nota:** 5.5/10 (após fix: 8.5/10)
**Severidade:** HIGH

### Diagnóstico
- Atualmente: pill com border 1px + background veil quando active. Visualmente parece "tab system" Bootstrap 2014.
- Linear 2026 abandonou pills em filter rows internas — usa label texto + sublinhado animado gold no active.
- Border-color transparent → accent-border 0.34 muda demais; cria "saltinho" cafona quando seleciona.
- Lowercase "ops" / "dev" é ✓ correto (correntemente lowercase = Atlas canon).
- Refresh button ↻ no fim da row está com border-soft visível — quebra unidade visual. Deveria ser ghost.

### Fix CSS · Linear-style underline

```css
/* atlas-ai.css · linha ~425 */
.atlas-ai-filter-row {
  display: flex;
  gap: 2px;                      /* WAS: 4px → mais firme */
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 0 2px;                /* WAS: 0 4px */
  align-items: center;
}

.atlas-ai-filter-tab {
  background: transparent;
  border: none;                  /* WAS: 1px solid transparent — remove border do model */
  border-radius: 0;              /* WAS: 5px */
  padding: 4px 8px 7px;          /* mais alto que largo, para acomodar underline */
  position: relative;
  font-family: var(--cc-font-sans);
  font-size: 11.5px;
  font-variation-settings: 'wght' 500;   /* WAS: 520 → mais leve em idle */
  text-transform: lowercase;
  letter-spacing: 0;
  color: var(--cc-text-faint);   /* WAS: muted → faint, mais hierárquico */
  cursor: pointer;
  transition: color 200ms var(--cc-ease-out);
}

.atlas-ai-filter-tab::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  height: 1.5px;
  background: transparent;
  transition: background 200ms var(--cc-ease-out);
}

.atlas-ai-filter-tab:hover {
  color: var(--cc-text-strong);
  background: transparent;       /* WAS: rgba veil — Linear não usa veil em filter */
}

.atlas-ai-filter-tab.is-active {
  background: transparent;       /* WAS: accent-veil */
  color: var(--cc-text-strong);  /* WAS: accent-strong */
  font-variation-settings: 'wght' 580;  /* peso bumpa no active */
}

.atlas-ai-filter-tab.is-active::after {
  background: var(--cc-accent);  /* gold underline 1.5px */
}
```

### Refresh button — ghost icon

```css
/* atlas-ai.css · linha ~463 */
.atlas-ai-refresh {
  margin-left: auto;
  background: transparent;
  border: none;                  /* WAS: 1px solid border-soft → remove caixa */
  border-radius: 4px;
  width: 22px;                   /* WAS: 26px → mais firme */
  height: 22px;
  font-size: 12px;
  color: var(--cc-text-faint);   /* WAS: muted → faint */
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 160ms var(--cc-ease-out), background 160ms var(--cc-ease-out);
}

.atlas-ai-refresh:hover {
  color: var(--cc-accent);       /* WAS: text-strong → accent firme */
  background: var(--cc-accent-veil);
  border-color: transparent;
}

.atlas-ai-refresh:disabled {
  opacity: 0.4;
  cursor: progress;
}
```

---

## 3. Eyebrow "PROJETOS" (tree section head)

**Nota:** 7.5/10 (após fix: 9.0/10)
**Severidade:** low

### Diagnóstico
- 10.5px uppercase letter-spacing 0.1em weight 580 — ✓ correto canon Atlas. Mantém peso editorial.
- Cor faint — ✓ corretamente hierárquico abaixo dos titles.
- Padding (4px 4px 4px) — assimétrico, falta vertical breathing acima quando vem após divider do header.
- Falta variant para Fixados/Chats: hoje todos usam o mesmo eyebrow style.

### Fix CSS

```css
/* atlas-ai.css · linha ~1898 */
.atlas-ai-tree-section-head {
  padding: 10px 6px 4px;         /* WAS: 4px 4px 4px — adiciona breathing top */
  font-family: var(--cc-font-sans);
  font-size: 10px;               /* WAS: 10.5px → mais editorial */
  font-variation-settings: 'wght' 600;  /* WAS: 580 → 600 firme uppercase */
  text-transform: uppercase;
  letter-spacing: 0.12em;        /* WAS: 0.1em → mais "editorial Atlas" */
  color: var(--cc-text-faint);
  line-height: 1;                /* trava altura */
}

/* Primeiro section sem padding-top extra */
.atlas-ai-thread-tree > .atlas-ai-tree-section:first-child .atlas-ai-tree-section-head {
  padding-top: 2px;
}
```

---

## 4. Folder header "atlas · 31"

**Nota:** 6.5/10 (após fix: 9.0/10)
**Severidade:** medium

### Diagnóstico
- Caret ▾ + folder icon SVG + nome + count à direita — estrutura grid correta.
- **Problema 1:** caret unicode ▾ tem render inconsistente entre fonts no macOS — fica peludo. Usar chevron SVG inline.
- **Problema 2:** count "31" usando mono 10.5px sem tabular-nums explícito, sem alinhamento direito firme.
- **Problema 3:** folder icon SVG ocupa coluna fixa 14px mas só pinta 13×11 — fica desalinhado opticamente com nome.
- **Problema 4:** padding 5px 4px é apertado demais; folder header parece tight vs threads que têm 10px.
- **Problema 5:** quando collapsed, falta indicador visual claro de que tem N threads escondidas.

### Fix CSS

```css
/* atlas-ai.css · linha ~1914 */
.atlas-ai-folder-head {
  display: grid;
  grid-template-columns: 10px 14px minmax(0, 1fr) auto;  /* WAS: 12px 14px ... */
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 6px;              /* WAS: 5px 4px — respira mais */
  background: transparent;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  color: var(--cc-text-muted);
  transition: background 160ms var(--cc-ease-out), color 160ms var(--cc-ease-out);
  text-align: left;
}

.atlas-ai-folder-head:hover {
  background: rgba(233, 238, 242, 0.035);  /* mais sutil que 0.04 */
  color: var(--cc-text-strong);
}

.atlas-ai-folder-head:hover .atlas-ai-folder-caret,
.atlas-ai-folder-head:hover .atlas-ai-folder-icon {
  color: var(--cc-text-muted);
}

.atlas-ai-folder-caret {
  font-size: 0;                  /* WAS: 9px unicode — substituir por SVG inline (ver JSX) */
  width: 10px;
  height: 10px;
  color: var(--cc-text-faint);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 180ms var(--cc-ease-out);
}

/* When expanded, caret pointed down */
.atlas-ai-folder[data-expanded='true'] .atlas-ai-folder-caret {
  transform: rotate(90deg);
}

.atlas-ai-folder-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--cc-text-faint);   /* WAS: muted → faint pra não competir com nome */
  width: 14px;
  height: 14px;
}

.atlas-ai-folder-name {
  font-family: var(--cc-font-sans);
  font-size: 12.5px;
  font-variation-settings: 'wght' 560;   /* WAS: 540 → 560 firme */
  color: var(--cc-text-strong);
  letter-spacing: -0.003em;              /* tightening sub-pixel */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Count vira chip sutil mono tabular */
.atlas-ai-folder-count {
  font-family: var(--cc-font-mono);
  font-size: 10.5px;
  font-variation-settings: 'wght' 460;
  font-feature-settings: 'tnum' 1, 'lnum' 1;   /* tabular nums obrigatório */
  color: var(--cc-text-faint);
  letter-spacing: 0;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(233, 238, 242, 0.04);  /* veil sutil — diferencia do nome */
  line-height: 1.4;
  min-width: 18px;
  text-align: center;
}

.atlas-ai-folder-head:hover .atlas-ai-folder-count {
  background: rgba(233, 238, 242, 0.07);
  color: var(--cc-text-muted);
}
```

### Fix JSX · caret SVG inline

```tsx
{/* Substituir o span unicode ▸/▾ por SVG inline.
    Markup também ganha data-expanded para CSS transform. */}
<div
  key={key}
  className="atlas-ai-folder"
  data-expanded={!isCollapsed}
>
  <button
    type="button"
    className="atlas-ai-folder-head"
    onClick={() => toggleCollapsed(key)}
    aria-expanded={!isCollapsed}
  >
    <span className="atlas-ai-folder-caret" aria-hidden="true">
      <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 2 L6.5 5 L3.5 8" />
      </svg>
    </span>
    <span className="atlas-ai-folder-icon" aria-hidden="true">
      <svg viewBox="0 0 16 14" width="13" height="11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1.5 4.5a1.5 1.5 0 0 1 1.5-1.5h3.4l1.5 1.5H13a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 13 12.5H3A1.5 1.5 0 0 1 1.5 11Z" />
      </svg>
    </span>
    <span className="atlas-ai-folder-name" title={key}>{key}</span>
    <span className="atlas-ai-folder-count">{list.length}</span>
  </button>
  {/* ... */}
</div>
```

---

## 5. Thread item · idle (não selecionado)

**Nota:** 7.5/10 (após fix: 9.0/10)
**Severidade:** low

### Diagnóstico
- Padding 10px 10px — bom espaço de toque, mas vertical pode descer um pouquinho.
- Title 13px peso 520 — bom contraste hierárquico com folder name 560.
- Border-radius 6px — ✓ coerente com canon Atlas.
- **Problema:** thread items dentro de folder com `is-indented` ganham padding-left 26px — mas isso desalinha o título exatamente do folder name (que está em coluna grid depois do caret+icon). Em Linear/Notion as sub-rows alinham com o folder NAME, não com o ícone.
- Falta micro-stripe visual à esquerda do item indentado para denunciar a relação visual com folder.

### Fix CSS

```css
/* atlas-ai.css · linha ~496 */
.atlas-ai-thread-button {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  width: 100%;
  padding: 7px 10px;            /* WAS: 10px 10px → 7px firme vertical, density+ */
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;            /* WAS: 6px → mais firme */
  cursor: pointer;
  text-align: left;
  font-family: var(--cc-font-sans);
  color: inherit;
  transition:
    background 160ms var(--cc-ease-out),
    border-color 160ms var(--cc-ease-out),
    box-shadow 160ms var(--cc-ease-out);
  position: relative;            /* para ::before stripe */
}

/* Indent: 26px → 30px e adiciona stripe visual */
.atlas-ai-thread-item.is-indented .atlas-ai-thread-button {
  padding-left: 30px;            /* WAS: 26px — alinha com folder-name coluna 3 */
}

.atlas-ai-thread-item.is-indented .atlas-ai-thread-button::before {
  content: '';
  position: absolute;
  left: 16px;                    /* abaixo do caret column */
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: var(--cc-border-soft);
  pointer-events: none;
}

/* Hover do item indentado: stripe acende */
.atlas-ai-thread-item.is-indented .atlas-ai-thread-button:hover::before {
  background: var(--cc-border);
}
```

---

## 6. Thread item · SELECTED ("Esta funcionando ?")

**Nota:** 6.0/10 (após fix: 9.5/10)
**Severidade:** HIGH (este é o estado MAIS importante da sidebar)

### Diagnóstico
- Atualmente: só `background: accent-veil` + `border-color: accent-border`. Resultado: o item "pisca" pra cima do background dark teal mas o destaque é tímido — em Slack/Linear o selected canta sem gritar.
- **Faltam 3 sinais simultâneos** que premium sidebars usam:
  1. **Accent stripe à esquerda 2px** — sinal visual instantâneo de "você está aqui"
  2. **Title weight bump** 520→580 — peso fala mais que cor
  3. **Time color shift** — time ganha cor accent muted, denunciando ativo
- Box-shadow inset zerada — premium apps frequentemente adicionam 1px inset top branco fantasma para "elevar" o item selecionado.

### Fix CSS · selected state robusto

```css
/* atlas-ai.css · linha ~517 */
.atlas-ai-thread-item.is-selected .atlas-ai-thread-button {
  background: var(--cc-accent-veil);
  border-color: var(--cc-accent-border);
  box-shadow:
    inset 2px 0 0 var(--cc-accent),                   /* GOLD STRIPE LEFT 2px */
    inset 0 1px 0 rgba(255, 255, 255, 0.025);         /* ghost highlight top */
}

.atlas-ai-thread-item.is-selected .atlas-ai-thread-title {
  font-variation-settings: 'wght' 580;                /* WAS: 520 → 580 */
  color: var(--cc-text-strong);
  letter-spacing: -0.005em;                           /* sub-pixel tighten quando bold */
}

.atlas-ai-thread-item.is-selected .atlas-ai-thread-time {
  color: var(--cc-accent);                            /* time vira gold */
  font-variation-settings: 'wght' 500;                /* WAS: 440 → 500 firme */
}

/* Indentado e selecionado: stripe da indent é absorvido pelo stripe accent */
.atlas-ai-thread-item.is-indented.is-selected .atlas-ai-thread-button::before {
  background: transparent;                            /* desliga linha guide quando selected */
}

/* Selected também elimina border-soft do hover — visual unificado */
.atlas-ai-thread-item.is-selected .atlas-ai-thread-button:hover {
  border-color: var(--cc-accent-border);              /* trava na cor selected */
  background: var(--cc-accent-veil);
}
```

---

## 7. Thread item · HOVER

**Nota:** 7.0/10 (após fix: 8.5/10)
**Severidade:** medium

### Diagnóstico
- Hover atual: `background rgba(233, 238, 242, 0.035)` + `border-color border-soft`. Sutil ✓.
- **Problema:** o border-color em hover pode ficar duplicado com o stripe vertical de indent — duas linhas próximas competindo.
- **Falta:** cursor reveal de actions (Cursor faz isso). Hoje a row hover não diz "tem mais aqui dentro".
- Transition 200ms é lenta demais para hover (idealmente 120-160ms para sidebar feedback).

### Fix CSS

```css
/* atlas-ai.css · linha ~512 */
.atlas-ai-thread-button:hover {
  background: rgba(233, 238, 242, 0.04);            /* WAS: 0.035 → 0.04 */
  border-color: transparent;                         /* WAS: var(--cc-border-soft) — REMOVE border, prefere stripe */
  box-shadow: inset 2px 0 0 rgba(233, 238, 242, 0.10);  /* hairline stripe esquerda em hover */
}

/* Transition mais rápida pra feel responsivo */
.atlas-ai-thread-button {
  transition:
    background 140ms var(--cc-ease-out),
    box-shadow 140ms var(--cc-ease-out);            /* WAS: 200ms */
}

/* Hover NUNCA sobrescreve selected */
.atlas-ai-thread-item.is-selected .atlas-ai-thread-button:hover {
  box-shadow:
    inset 2px 0 0 var(--cc-accent),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}
```

### Bonus: hover reveal actions (Cursor pattern)

Se quiser implementar slot pra ações latentes (pin, delete, etc.) no hover:

```css
.atlas-ai-thread-actions {
  display: none;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  gap: 2px;
}

.atlas-ai-thread-button:hover .atlas-ai-thread-actions {
  display: flex;
}

.atlas-ai-thread-action {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  background: transparent;
  border: none;
  color: var(--cc-text-faint);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.atlas-ai-thread-action:hover {
  background: rgba(233, 238, 242, 0.06);
  color: var(--cc-text-strong);
}
```

---

## 8. Time formatting "2min / 1h / 2h / 6d"

**Nota:** 6.5/10 (após fix: 9.0/10)
**Severidade:** medium

### Diagnóstico
- Time 11px peso 440 faint — ✓ hierarquicamente correto.
- **Problema 1:** mistura unidades sem tabular-nums — "2min" e "1h" ficam com larguras diferentes. Em sidebar com lista vertical de tempos, eyes lêem padrão "2_, 1_, 2_, 2_, 3_" — números desalinhados quebram esse padrão.
- **Problema 2:** "2min" é texto verbose. Premium apps usam "2m". Notion/Linear: "2m, 1h, 6d". Atlas hoje mistura "2min" (verbose) com "1h" (compacto) — inconsistente.
- **Problema 3:** time não tem alinhamento direito enforced — em rows com title curto, time anda; em rows com title longo+ellipsis, time fica visualmente "encostado" no fim. Solução: column firme + tabular-nums.
- **Problema 4:** quando selected, time fica accent — bom. Mas font weight não bumpa, fica inconsistente com title.

### Fix · timeFormat.ts

Inspecionar arquivo `apps/desktop/src/surfaces/atlas-ai/timeFormat.ts`. Mudar "2min" → "2m":

```ts
// Antes: '2min', '5min', '15min'
// Depois: '2m', '5m', '15m'

// Função sugerida:
export function formatRelativeShort(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const ms = Date.now() - date.getTime()
  const sec = Math.round(ms / 1000)
  if (sec < 60) return 'agora'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m`        // WAS: `${min}min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d`
  const w = Math.round(d / 7)
  if (w < 4) return `${w}sem`
  const mo = Math.round(d / 30)
  if (mo < 12) return `${mo}mês`
  const y = Math.round(d / 365)
  return `${y}a`
}
```

### Fix CSS

```css
/* atlas-ai.css · linha ~563 */
.atlas-ai-thread-time {
  font-family: var(--cc-font-mono);                /* WAS: sans → mono pra alinhamento perfeito */
  font-size: 10.5px;                                /* WAS: 11px → mono ler menor */
  font-variation-settings: 'wght' 440;
  font-feature-settings: 'tnum' 1, 'lnum' 1;        /* tabular-nums obrigatório */
  color: var(--cc-text-faint);
  flex-shrink: 0;
  letter-spacing: 0;
  min-width: 28px;                                  /* trava coluna */
  text-align: right;
  line-height: 1.4;
}

/* Selected: time accent + weight bump */
.atlas-ai-thread-item.is-selected .atlas-ai-thread-time {
  color: var(--cc-accent);
  font-variation-settings: 'wght' 520;              /* peso bumpa quando selected */
}
```

---

## 9. "Mostrar mais 26" link

**Nota:** 7.5/10 (após fix: 8.5/10)
**Severidade:** low

### Diagnóstico
- Hoje: link sutil 11.5px faint, hover → accent gold. ✓ coerente com canon.
- **Problema 1:** margin-left 22px tenta alinhar com thread title, mas após o fix de indent (30px), fica desalinhado.
- **Problema 2:** falta affordance visual de "expand" — só texto. Linear/Notion usam ↓ ou + sutil.
- **Problema 3:** "Mostrar mais 26" é verbose. "+26" ou "mais 26" é mais compacto.

### Fix CSS

```css
/* atlas-ai.css · linha ~1967 */
.atlas-ai-show-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  margin: 2px 0 4px 30px;        /* WAS: 22px → 30px alinha com thread title indentado */
  padding: 3px 6px;              /* WAS: 4px 6px → mais firme */
  font-family: var(--cc-font-sans);
  font-size: 11px;               /* WAS: 11.5px → mais discreto */
  font-variation-settings: 'wght' 480;  /* WAS: 500 → 480 mais leve, é affordance secundária */
  color: var(--cc-text-faint);
  cursor: pointer;
  letter-spacing: 0;
  border-radius: 4px;
  transition: color 140ms var(--cc-ease-out), background 140ms var(--cc-ease-out);
}

.atlas-ai-show-more::before {
  content: '+';
  font-family: var(--cc-font-mono);
  font-size: 11px;
  font-variation-settings: 'wght' 580;
  line-height: 1;
  opacity: 0.7;
}

.atlas-ai-show-more:hover {
  color: var(--cc-accent);
  background: var(--cc-accent-veil);
}

.atlas-ai-show-more:hover::before {
  opacity: 1;
}
```

### Fix JSX · texto mais compacto (opcional)

```tsx
{remaining > 0 ? (
  <button type="button" className="atlas-ai-show-more" onClick={() => toggleShowAll(key)}>
    mais {remaining}
  </button>
) : isExpandedAll && list.length > DEFAULT_VISIBLE_PER_PROJECT ? (
  <button type="button" className="atlas-ai-show-more" onClick={() => toggleShowAll(key)}>
    menos
  </button>
) : null}
```

---

## 10. Density geral & vertical rhythm

**Nota:** 6.0/10 (após fix: 9.0/10)
**Severidade:** HIGH

### Diagnóstico
- Total vertical rhythm está **inconsistente**:
  - Header: padding 0 4px + margin-bottom 12px
  - Filter row: padding 0 4px + margin-bottom 10px
  - Tree section gap: 16px entre sections, 2px gap interno
  - Folder head: padding 5px 4px
  - Thread item: padding 10px 10px + gap 2px entre items
  - Show more: margin 2px 0 6px 22px
- Resultado: olho não consegue ancorar grid vertical. Itens "flutuam" em alturas variadas. Em Linear, todo elemento da sidebar é múltiplo de 4px firme.

### Fix · sistema 4px grid

Recipe consolidado dos fixes acima já implementa isso, mas explicitando:

| Elemento                  | Padding atual         | Padding novo        | Altura final |
|---------------------------|----------------------|---------------------|--------------|
| Header (.history-header)  | 0 4px + mb 12px      | 0 6px 8px + mb 8px  | ~32px        |
| Filter tab (.filter-tab)  | 3px 9px              | 4px 8px 7px         | 24px         |
| Refresh (.refresh)        | 22h × 26w            | 22h × 22w           | 22px         |
| Section head (.tree-head) | 4px 4px              | 10px 6px 4px        | 16px         |
| Folder head (.folder-head)| 5px 4px              | 6px 6px             | 26px         |
| Thread button (.thread-btn)| 10px 10px           | 7px 10px            | 30px         |
| Show more (.show-more)    | 4px 6px              | 3px 6px             | 22px         |

**Resultado:** thread item 30px = 4×7.5 → arredonda para 32px se quisermos múltiplo perfeito. Folder head 26px = 4×6.5. Tudo encaixa em grid 4px com boa margem.

### CSS unificado · gap globals

```css
/* atlas-ai.css · linha ~1887 */
.atlas-ai-thread-tree {
  display: flex;
  flex-direction: column;
  gap: 12px;                     /* WAS: 16px → mais firme entre sections */
  overflow-y: auto;
  min-height: 0;
  padding-bottom: 8px;
}

.atlas-ai-tree-section { display: flex; flex-direction: column; gap: 1px; }  /* WAS: 2px → 1px tight */

.atlas-ai-thread-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  overflow-y: visible;           /* WAS: auto — scroll fica no tree wrapper */
  min-height: 0;
  gap: 0;                        /* WAS: 2px → 0, density premium */
}
```

---

## 11. Scrollbar polish (esqueci de mencionar mas critico em sidebar)

**Severidade:** medium

### Fix CSS

```css
/* atlas-ai.css · adicionar em algum lugar visível */
.atlas-ai-thread-tree::-webkit-scrollbar {
  width: 6px;
}

.atlas-ai-thread-tree::-webkit-scrollbar-track {
  background: transparent;
}

.atlas-ai-thread-tree::-webkit-scrollbar-thumb {
  background: rgba(233, 238, 242, 0.06);
  border-radius: 3px;
  border: 1px solid transparent;
  background-clip: padding-box;
}

.atlas-ai-thread-tree::-webkit-scrollbar-thumb:hover {
  background: rgba(233, 238, 242, 0.12);
  background-clip: padding-box;
}

/* Firefox */
.atlas-ai-thread-tree {
  scrollbar-width: thin;
  scrollbar-color: rgba(233, 238, 242, 0.08) transparent;
}
```

---

## 12. Folder count badge "31"

**Nota:** 5.5/10 (após fix: 9.0/10)
**Severidade:** medium

### Diagnóstico (já coberto na seção 4)
- Atualmente apenas número mono pequeno faint sem background — quase invisível.
- Premium pattern: badge sutil veil + tabular-nums + min-width.

Fix está embutido no recipe de "Folder header" (seção 4) com `.atlas-ai-folder-count` ganhando background `rgba(233, 238, 242, 0.04)` e padding `1px 5px`.

---

## Recipe consolidado · Diff Pronto

Para aplicar todos os fixes P0/P1, este é o diff mínimo necessário em `atlas-ai.css`:

```css
/* ═══════════════════════════════════════════════════════════════════════════
   THREAD LIST ENTERPRISE POLISH · 2026-05-15
   Substituir blocos correspondentes nos ranges:
   - 396–579 (history + filter + thread)
   - 1887–2030 (tree + folder + show more)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Header ─── */
.atlas-ai-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 6px 8px;
  position: relative;
}
.atlas-ai-history-header::after {
  content: '';
  position: absolute;
  left: 6px; right: 6px; bottom: 0;
  height: 1px;
  background: var(--cc-border-soft);
}
.atlas-ai-history-header h3 {
  font-variation-settings: 'wght' 600;
  font-size: 13px;
  letter-spacing: -0.005em;
  color: var(--cc-text-strong);
  margin: 0;
}
.atlas-ai-history-header .atlas-ai-link {
  font-size: 11.5px;
  font-variation-settings: 'wght' 520;
  color: var(--cc-text-muted);
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.atlas-ai-history-header .atlas-ai-link:hover {
  color: var(--cc-accent);
  background: var(--cc-accent-veil);
}

/* ─── Filter tabs Linear-style ─── */
.atlas-ai-filter-row {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 0 2px;
  align-items: center;
}
.atlas-ai-filter-tab {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 4px 8px 7px;
  position: relative;
  font-size: 11.5px;
  font-variation-settings: 'wght' 500;
  text-transform: lowercase;
  letter-spacing: 0;
  color: var(--cc-text-faint);
  cursor: pointer;
  transition: color 200ms var(--cc-ease-out);
}
.atlas-ai-filter-tab::after {
  content: '';
  position: absolute;
  left: 8px; right: 8px; bottom: 0;
  height: 1.5px;
  background: transparent;
  transition: background 200ms var(--cc-ease-out);
}
.atlas-ai-filter-tab:hover {
  color: var(--cc-text-strong);
  background: transparent;
}
.atlas-ai-filter-tab.is-active {
  background: transparent;
  color: var(--cc-text-strong);
  font-variation-settings: 'wght' 580;
}
.atlas-ai-filter-tab.is-active::after { background: var(--cc-accent); }

/* ─── Refresh ghost ─── */
.atlas-ai-refresh {
  margin-left: auto;
  background: transparent;
  border: none;
  border-radius: 4px;
  width: 22px; height: 22px;
  font-size: 12px;
  color: var(--cc-text-faint);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 160ms var(--cc-ease-out), background 160ms var(--cc-ease-out);
}
.atlas-ai-refresh:hover {
  color: var(--cc-accent);
  background: var(--cc-accent-veil);
}
.atlas-ai-refresh:disabled { opacity: 0.4; cursor: progress; }

/* ─── Eyebrow ─── */
.atlas-ai-tree-section-head {
  padding: 10px 6px 4px;
  font-size: 10px;
  font-variation-settings: 'wght' 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cc-text-faint);
  line-height: 1;
}
.atlas-ai-thread-tree > .atlas-ai-tree-section:first-child .atlas-ai-tree-section-head {
  padding-top: 2px;
}

/* ─── Folder ─── */
.atlas-ai-folder-head {
  display: grid;
  grid-template-columns: 10px 14px minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 6px;
  background: transparent;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  color: var(--cc-text-muted);
  transition: background 160ms var(--cc-ease-out), color 160ms var(--cc-ease-out);
  text-align: left;
}
.atlas-ai-folder-head:hover {
  background: rgba(233, 238, 242, 0.035);
  color: var(--cc-text-strong);
}
.atlas-ai-folder-caret {
  font-size: 0;
  width: 10px; height: 10px;
  color: var(--cc-text-faint);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 180ms var(--cc-ease-out);
}
.atlas-ai-folder[data-expanded='true'] .atlas-ai-folder-caret { transform: rotate(90deg); }
.atlas-ai-folder-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--cc-text-faint);
  width: 14px; height: 14px;
}
.atlas-ai-folder-name {
  font-size: 12.5px;
  font-variation-settings: 'wght' 560;
  color: var(--cc-text-strong);
  letter-spacing: -0.003em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.atlas-ai-folder-count {
  font-family: var(--cc-font-mono);
  font-size: 10.5px;
  font-variation-settings: 'wght' 460;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  color: var(--cc-text-faint);
  letter-spacing: 0;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(233, 238, 242, 0.04);
  line-height: 1.4;
  min-width: 18px;
  text-align: center;
}
.atlas-ai-folder-head:hover .atlas-ai-folder-count {
  background: rgba(233, 238, 242, 0.07);
  color: var(--cc-text-muted);
}

/* ─── Thread item ─── */
.atlas-ai-thread-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.atlas-ai-thread-button {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  width: 100%;
  padding: 7px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
  color: inherit;
  position: relative;
  transition:
    background 140ms var(--cc-ease-out),
    box-shadow 140ms var(--cc-ease-out);
}
.atlas-ai-thread-button:hover {
  background: rgba(233, 238, 242, 0.04);
  border-color: transparent;
  box-shadow: inset 2px 0 0 rgba(233, 238, 242, 0.10);
}
.atlas-ai-thread-item.is-selected .atlas-ai-thread-button {
  background: var(--cc-accent-veil);
  border-color: var(--cc-accent-border);
  box-shadow:
    inset 2px 0 0 var(--cc-accent),
    inset 0 1px 0 rgba(255, 255, 255, 0.025);
}
.atlas-ai-thread-item.is-selected .atlas-ai-thread-button:hover {
  border-color: var(--cc-accent-border);
  background: var(--cc-accent-veil);
  box-shadow:
    inset 2px 0 0 var(--cc-accent),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}
.atlas-ai-thread-item.is-indented .atlas-ai-thread-button { padding-left: 30px; }
.atlas-ai-thread-item.is-indented .atlas-ai-thread-button::before {
  content: '';
  position: absolute;
  left: 16px; top: 8px; bottom: 8px;
  width: 1px;
  background: var(--cc-border-soft);
  pointer-events: none;
}
.atlas-ai-thread-item.is-indented .atlas-ai-thread-button:hover::before { background: var(--cc-border); }
.atlas-ai-thread-item.is-indented.is-selected .atlas-ai-thread-button::before { background: transparent; }

/* ─── Title + time ─── */
.atlas-ai-thread-title {
  font-size: 13px;
  color: var(--cc-text-strong);
  font-variation-settings: 'wght' 520;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0;
  flex: 1;
  min-width: 0;
}
.atlas-ai-thread-item.is-selected .atlas-ai-thread-title {
  font-variation-settings: 'wght' 580;
  letter-spacing: -0.005em;
}
.atlas-ai-thread-time {
  font-family: var(--cc-font-mono);
  font-size: 10.5px;
  font-variation-settings: 'wght' 440;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  color: var(--cc-text-faint);
  flex-shrink: 0;
  letter-spacing: 0;
  min-width: 28px;
  text-align: right;
  line-height: 1.4;
}
.atlas-ai-thread-item.is-selected .atlas-ai-thread-time {
  color: var(--cc-accent);
  font-variation-settings: 'wght' 520;
}

/* ─── Show more ─── */
.atlas-ai-show-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  margin: 2px 0 4px 30px;
  padding: 3px 6px;
  font-size: 11px;
  font-variation-settings: 'wght' 480;
  color: var(--cc-text-faint);
  cursor: pointer;
  letter-spacing: 0;
  border-radius: 4px;
  transition: color 140ms var(--cc-ease-out), background 140ms var(--cc-ease-out);
}
.atlas-ai-show-more::before {
  content: '+';
  font-family: var(--cc-font-mono);
  font-size: 11px;
  font-variation-settings: 'wght' 580;
  line-height: 1;
  opacity: 0.7;
}
.atlas-ai-show-more:hover {
  color: var(--cc-accent);
  background: var(--cc-accent-veil);
}
.atlas-ai-show-more:hover::before { opacity: 1; }

/* ─── Tree wrapper ─── */
.atlas-ai-thread-tree {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(233, 238, 242, 0.08) transparent;
}
.atlas-ai-thread-tree::-webkit-scrollbar { width: 6px; }
.atlas-ai-thread-tree::-webkit-scrollbar-track { background: transparent; }
.atlas-ai-thread-tree::-webkit-scrollbar-thumb {
  background: rgba(233, 238, 242, 0.06);
  border-radius: 3px;
}
.atlas-ai-thread-tree::-webkit-scrollbar-thumb:hover { background: rgba(233, 238, 242, 0.12); }
.atlas-ai-tree-section { display: flex; flex-direction: column; gap: 1px; }
```

---

## Plano de Implementação

### Fase 1 · P0 (15min)
1. Selected state robusto (seção 6) — accent stripe + weight bump
2. Filter tabs Linear underline (seção 2)
3. Thread row density 10→7 padding (seção 5)

### Fase 2 · P1 (10min)
4. Folder count badge polish (seção 4 + 12)
5. Eyebrow padding fix (seção 3)
6. Show more refinements (seção 9)

### Fase 3 · P2 (5min)
7. Time format "2min"→"2m" no timeFormat.ts (seção 8)
8. Refresh ghost button (seção 2)
9. Header divider + alignment (seção 1)
10. Scrollbar polish (seção 11)

**Total estimado:** 30min · CSS-only com 1 ajuste de string em timeFormat.ts.

---

## Validação visual recomendada

Antes de aplicar:
- [ ] Confirmar tokens slate teal carregados em `.atlas-shell.surface-atlas-ai` (mesma família surface-code)
- [ ] Selecionar uma thread em projeto vs fixada vs órfã — selected state deve ser idêntico nas 3 zonas
- [ ] Hover em folder vs thread vs filter tab — feedback distinto mas consistente em timing
- [ ] Time stamps em lista vertical (5+ threads) — números devem alinhar coluna direita perfeita (tabular-nums)
- [ ] Resize do rail para min-width — selected stripe gold deve permanecer visível

Após aplicar:
- [ ] Screenshot comparativo antes/depois mesma viewport
- [ ] Validar no surface-code (Atlas Code Forge) também — tokens compartilhados
- [ ] Trust ledger: confirmar nenhum CSS-only change quebra acessibilidade aria-current/aria-selected

---

## Anti-patterns evitados

- ❌ Web design tropes: pill filter tabs com border-color animado
- ❌ Emojis no UI (folder count, time, selected indicator) — premium usa SVG inline
- ❌ Cores agressivas em selected (background sólido) — preferimos veil + stripe
- ❌ Múltiplos border visíveis em hover/selected — preferimos box-shadow inset stripe
- ❌ Unicode caret ▾/▸ inconsistente entre macOS fonts — SVG inline
- ❌ Time verbose "2min" — todos premium usam "2m"
- ❌ Mistura mono/sans em mesma row sem grid firme — tabular-nums obrigatório em time
- ❌ Gap excessivo entre folder e threads filho — density premium é tight

---

## Sources

- [Linear UI Refresh Mar 2026](https://linear.app/changelog/2026-03-12-ui-refresh)
- [Linear · How we redesigned the UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Notion sidebar UI Breakdown](https://medium.com/@quickmasum/ui-breakdown-of-notions-sidebar-2121364ec78d)
- [Cursor Chat History Docs](https://cursor.com/docs/agent/chat/history)
- [Mercury Banking UI Screens](https://nicelydone.club/apps/mercury)
- [Vercel New Dashboard](https://vercel.com/try/new-dashboard)
- [Sidebar Design UX Best Practices 2026](https://www.alfdesigngroup.com/post/improve-your-sidebar-design-for-web-apps)
- [Slack Sidebar CSS customization](https://gist.github.com/c7137a750280eeb7b47bc7f04e9f2c9c)
