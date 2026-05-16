# Polish premium · dev tools 2026

> Research sweep · 2026-05-15 · Atlas design researcher
> Mandate: cataloguar como Cursor, Warp, Raycast, Linear, Arc, Zed, v0, Cline renderem código + status + actions sem virar amador, para informar refit visual da surface Code (slate teal + atlas gold).
> Contexto Atlas: hoje pílulas tipo `app/Services/Ai/Programming/Governance/` parecem Bootstrap docs template; tabelas com headers uppercase yellow parecem SEO blog 2018. Meta: superar Cursor v0.45 / Codex / Aider / Warp / Raycast em polish.
> Canon predecessor: `docs/architecture/0007-atlas-desktop-design-system.md` (capítulo 16 · surface code dark) · `feedback_atlas_quality_focus`.

---

## 0 · TL;DR (caso só leia 30 segundos)

**Padrão dominante 2026 nas categorias premium**:

1. **Cor é sempre dessaturada** (8-12% alpha em cima de neutral) — Vercel Geist `*-subtle`, Linear status filled-vs-outline icons, Warp red-sidebar sutil. Bootstrap fill 100% saturado é o tell amador #1.
2. **Border-radius é sempre conservador** — Linear/Vercel 4-6px, Arc 8px em surfaces grandes, Warp blocks 4px. Capsule (`border-radius: 999px`) só em chips muito pequenos ou call-to-action principal. Atlas canon `2-3px` é coerente.
3. **Tipografia operacional é SANS-MONO híbrido** — identifier inline = mono leve (tabular). Status label = sans caps 9-10px tracking 0.04em. NUNCA mono em label de chip de status.
4. **Status indicator é DOT + LABEL externo**, NÃO pílula colorida traffic-light. Linear filled-circle 8px, Warp dot 6px, Vercel `<StatusDot />`. A cor só vive no dot. O fundo do row continua neutral.
5. **File path inline é UMA classe só**: monospace 11-12px, cor faint (`text-muted`/Tailwind `text-neutral-500`), sem background, sem border. Caractere `/` herda mesma cor. NÃO pílula amarela ou caixa cinza preenchida.
6. **Actions têm 3 níveis honestos**: primary (1 por linha), secondary (texto+ícone, sem background), ghost (só ícone, hover apenas). Destructive = ghost com texto vermelho dessaturado, modal de confirm — NÃO pink alarmista no botão idle.
7. **Tabelas premium têm zero linhas verticais e hairlines horizontais alpha 6-12%**. Header é sans-serif minúsculo (não uppercase yellow). Row hover = neutral 4% alpha, jamais cor saturada.

Atlas Code já tem tokens corretos no canon (`--cc-success: #82b577`, `--cc-danger: #d05a52` dessaturados, `--cc-accent: #d4a85a` atlas gold burnished). O problema não é a paleta — é **como ela é aplicada**. Este doc dá os recipes específicos.

---

## 1 · Tabela comparativa · 8 produtos × 8 dimensões

| Produto | Code chip inline | File path inline | Status indicator | Action primary | Action destructive | Table header | Section header | Density |
|---|---|---|---|---|---|---|---|---|
| **Cursor v3** | Pill com fundo `bg-secondary` (~6% alpha), borda 1px, radius 4px, font mono 12px, label só + ícone arquivo 12px monocromático [unconfirmed visual detail; release notes só citam "inline pills" em v2.0] | mono 12px text-muted, sem fundo, click → revealer no editor | Dot 6px + label sans 11px ao lado; sem fundo no row | Solid `bg-foreground / text-background` (high-contrast invert), 8px radius, peso médium | Texto vermelho `text-destructive`, ghost background, confirm dialog | Sans 12px tracking 0.04em, lower-case mixed | Sans 14-15px medium, hairline abaixo | Compacta — `py-1.5 px-2` em rows |
| **Warp** | Block command é mono 13px, render direto sem chip, prompt prefix dim | Path no prompt = ANSI dim cyan (configurable theme) | **Sidebar stripe 2-3px vertical à esquerda do block** (cinza idle / vermelho exit≠0) + dot opcional. Não há pill colorida | Botão pill com fundo accent (theme-driven), 6-8px radius | Confirm via modal/sheet (sem botão vermelho idle) | n/a (blocks não usam tabela) | "Sticky command header" mono dim no topo do block durante scroll | Compacta com `compact mode` toggle |
| **Raycast** | Lista item = ícone + label sans + accessories sans dim à direita; código aparece em monospace 12px sem pill | Path com `~/` syntax mono dim | Subtitle text dim ou ícone status (check, circle, exclamation) — não pílula | Botão "Action" no panel (cmd-K secondary), com tag de keybind à direita | Mesma list-item, badge `destructive` sem cor saturada idle | Eyebrow sans caps 10-11px tracking 0.05em | Sans 13px medium | Compacta — list items 36-40px altura |
| **Linear** | Issue key (`ENG-1234`) renderizado como **texto mono dim** no list (sem pill), só vira pill no detail header | Path raramente exposto; identifier = mono dim | **Filled circle 14px com stroke** indicating progress: empty=Backlog, dotted=Todo, half-pie=In Progress, full=Done. Cor por status (cinza/cinza/yellow-muted/green-muted) [unconfirmed exact hex] | Solid indigo (woodsmoke-bg-light variant), 6px radius, peso medium | Texto vermelho-muted em menu, confirm modal | Sans 11px caps tracking 0.06em **muted gray** (NÃO yellow) | Sans 13-14px semi-bold; eyebrow sans micro-caps acima | Densa — rows 32-34px |
| **Arc** | Inline code em mono 13px, fundo `bg-secondary` apenas com `--radius-sm` | Path como mono dim, no command bar | Dot 6px + label, ou ícone Lucide outlined | Botão accent gradient sutil (space-gradient), 8px radius `--radius-lg` | Ghost com texto vermelho | n/a (browser, não tem tabela operacional) | Eyebrow sans caps tiny acima de title | Espaçada (240px sidebar default) |
| **Zed** | @-mention chip mono 12px com fundo dim e radius 4px [inferido de docs Agent Panel] | mono dim igual Cursor; ações: jump-to-file | Tool-call inline "running/done/error" com ícone + label sans dim, sem fundo no card | Botão "Accept/Reject" pequeno solid accent | Ghost vermelho com texto only | Sans 12px dim | Sans 13px medium | Compacta — agent panel é dense list |
| **Vercel v0** | Badge component variant `gray-subtle` (bg 8% gray, fg neutral); status badge usa variant `*-subtle` | mono inline em `text-muted` | `<StatusDot />` 8px filled + label sans 12px | Button type=primary (solid dark on light, white text), radius ~6px | Button type=error (vermelho-muted), text-only ou solid em CTAs | Sans 12px tracking 0.04em text-muted | Sans 14-16px medium | Compacta a moderada |
| **Cline / Continue** | File chip baseado em VS Code style: ícone + filename + path dim, fundo 8% alpha, radius 4px [inferido docs] | mono dim inline | Token count + cost label inline subtle text; tool-call expansable card | Botões VS Code style — input box command palette pattern | Botão danger usa cor VS Code `--vscode-errorForeground` text-only | n/a | VS Code sectionHeader pattern (sans 11px caps muted) | Adapta ao theme VS Code do user |

**Síntese**:

- **Linear é o gold standard** para identifiers e status — text mono dim para chave (não pill), filled-circle com gradação para status. **Não usa yellow saturado em headers**.
- **Cursor v3 (oct 2025) consolidou** "inline pills" para file/directory references no input — fundo subtle, radius 4px, mono small ([cursor.com/changelog/2-0](https://cursor.com/changelog/2-0)).
- **Warp inventou o sidebar-stripe** como status visualization: vermelho só na borda esquerda do block + bg tint sutil quando exit≠0, jamais full-bg vermelho ([docs.warp.dev block basics](https://docs.warp.dev/terminal/blocks/block-basics/)).
- **Vercel Geist** popularizou os `*-subtle` variants em badges: `gray-subtle`, `blue-subtle`, `amber-subtle` etc. — todos usam fundo ~10% alpha + foreground escuro do mesmo hue ([vercel.com/geist/badge](https://vercel.com/geist/badge)).
- **Raycast** evita pílulas completamente no list — usa text-with-accessory pattern: label esquerda + dim accessory direita, ícone status pequeno.

---

## 2 · Top 10 padrões ultra-polidos

### 2.1 · Subtle background pattern (Vercel Geist `*-subtle`)

**Fonte**: [vercel.com/geist/badge](https://vercel.com/geist/badge), [seedflip.co/blog/vercel-design-system](https://seedflip.co/blog/vercel-design-system)
**Descrição visual**: badge tem background com alpha 8-12% do hue (ex.: `rgba(0, 112, 243, 0.10)` para blue-subtle) + foreground sólido do mesmo hue mas escuro/clarão dependendo do modo. Border 1px do hue alpha 18-22%. Padding 2px 6px. Mono ou sans 11-12px. Radius 4px.
**Por que é premium**: comunica categoria/status sem **gritar** — leitor escaneia, não é interrompido. Multiplica para 6-8 cores sem viral semáforo.
**Aplicação Atlas**: aplicar 100% em status chips de Atlas Code. `--cc-success-veil rgba(130, 181, 119, 0.12)` + `--cc-success #82b577` fg.

### 2.2 · Linear filled-circle status icon (vs pill)

**Fonte**: [linear.app/docs/configuring-workflows](https://linear.app/docs/configuring-workflows) (workflow editor permite cor por status), [getdesign.md/linear.app](https://getdesign.md/linear.app/design-md) ("ultra-minimal, precise")
**Descrição visual**: cada status é renderizado como **ícone circular 14px** com gradação:
- Backlog: círculo outline dashed cinza
- Todo: círculo outline solid cinza
- In Progress: pie-chart preenchido parcialmente (45° / 90° / 180°) yellow/orange muted
- Done: círculo cheio green muted com check ínfimo
- Canceled: círculo cinza com diagonal
A cor vive **só no ícone**, label fica neutral text. Hover do row = neutral 4% alpha, nunca yellow row.
**Por que é premium**: comunica progress em 1 glance sem ocupar pill-real-estate; densidade aumenta sem ruído.
**Aplicação Atlas**: substituir pílula `status: running/done/error` por ícone SVG 12-14px no Atlas Code. Cores `--cc-success`, `--cc-warning`, `--cc-danger` já existem.

### 2.3 · Warp sidebar stripe (peripheral exit-code signal)

**Fonte**: [docs.warp.dev/terminal/blocks/block-basics/](https://docs.warp.dev/terminal/blocks/block-basics/) ("Blocks que terminam com exit code não-zero têm fundo vermelho e sidebar vermelha"), [warp.dev/blog/how-to-draw-styled-rectangles-using-the-gpu-and-metal](https://www.warp.dev/blog/how-to-draw-styled-rectangles-using-the-gpu-and-metal) (UI primitives = retângulos com border + radius + gradient)
**Descrição visual**: cada block do terminal tem uma faixa vertical 2-3px à esquerda. Idle = transparente ou neutral 8%. Failed = vermelho dessaturado. Selected = thicker border + accent color. O **fundo do block** muda só LIGEIRAMENTE de tinta (tint 4-6%), nunca full-red.
**Por que é premium**: erro é informação periférica, não interrupção. O olho cata sem precisar parar.
**Aplicação Atlas**: tool-call cards no chat ganham `border-left: 2px solid var(--cc-status-color)`. Idle = `var(--cc-border-soft)`. Failed = `var(--cc-danger)` mas só 30% alpha no bg.

### 2.4 · Arc command bar elevation

**Fonte**: [blakecrosley.com/guides/design/arc](https://blakecrosley.com/guides/design/arc)
**Descrição visual**: command palette `min(600px, 90vw)` width, posicionada 20% from top. Surface elevation = dual-layer shadow (`box-shadow: 0 4px 32px rgba(0,0,0,0.20), inset 0 0 0 1px rgba(255,255,255,0.06)`). Backdrop-filter blur 24px. Radius 12px (mais que UI normal, por ser modal). Input com placeholder dim, sem border, herda surface bg.
**Por que é premium**: a modal floata sem afundar; o blur dá contexto sem ruído.
**Aplicação Atlas**: aplicar em qualquer popover futuro (cmd-K do Atlas Code, command palette de ações). Atlas canon já tem box-shadow concentric ring (capítulo 2.5) — alinhar.

### 2.5 · Cursor v2 inline pills no input

**Fonte**: [cursor.com/changelog/2-0](https://cursor.com/changelog/2-0) ("displays files and directories as inline pills" + "improved copy/paste functionality for tagged context")
**Descrição visual**: dentro do textarea/contenteditable do prompt, o `@file` mention vira um span inline com `bg-secondary` (subtle), mono 12px, radius 4px, padding `1px 5px`, ícone pequeno (file/folder) à esquerda. Click = jump-to-file. Hover = preview pop. Backspace deleta como unidade (NÃO char-by-char).
**Por que é premium**: o usuário SENTE que o input é estruturado, não um text-blob. Deleção atômica evita backspace-tedium.
**Aplicação Atlas**: implementar em todo input do Atlas Code chat. Mesmo classe `.cc-chip-file` reutilizada em mensagens já enviadas.

### 2.6 · Raycast list-item accessory pattern

**Fonte**: [manual.raycast.com/ai/chat](https://manual.raycast.com/ai/chat), [raycast.com/changelog/1-89-0](https://www.raycast.com/changelog/1-89-0)
**Descrição visual**: cada list-item = `icon (16px) | title (sans 13px) | subtitle dim | →→→ accessories alinhados direita (cmd-key tag, count badge, timestamp dim)`. Hover = bg neutral 6% alpha + accent bar 2px à esquerda. Focus visible = mesma + ring 1px accent ao redor.
**Por que é premium**: densa mas legível; o olho pula direto pra direita pra encontrar metadado.
**Aplicação Atlas**: usar em lista de tool-calls, lista de mensagens passadas, lista de arquivos no contexto. Atlas canon usa `eyebrow Mono caps + numeral romano + título + deck` (capítulo 5.1) — adaptar Raycast accessory à direita.

### 2.7 · Linear muted header (anti-yellow-caps)

**Fonte**: [linear.app/now/how-we-redesigned-the-linear-ui](https://linear.app/now/how-we-redesigned-the-linear-ui) ("reduced visual noise, maintain visual alignment, and increase the hierarchy and density of navigation elements")
**Descrição visual**: header de seção/coluna = sans 11px, tracking 0.06em (mas NOT uppercase), color `text-muted` (cinza neutro), peso 500. Há também variant uppercase mas SEMPRE em cinza neutro — jamais em yellow/orange saturado. Para destacar, usa-se sans 13-14px medium + cor primária.
**Por que é premium**: a hierarquia vem do tamanho+peso, não da cor. Cor saturada em label = SEO blog 2018, vibe Bootstrap docs.
**Aplicação Atlas**: substituir TODOS os headers uppercase yellow do Atlas Code por mono caps 9-10px tracking 1.4-2.4px (já canon Atlas) + `color: var(--cc-text-muted)`. Yellow só em accent canon (`--cc-accent`) e SÓ em hover/focus de elementos primários.

### 2.8 · Zed multi-buffer Review Changes

**Fonte**: [zed.dev/docs/ai/agent-panel](https://zed.dev/docs/ai/agent-panel)
**Descrição visual**: ao invés de injetar diff INLINE no chat (Cursor pre-v2), Zed abre uma **tab dedicada "Review Changes"** que mostra todos os arquivos editados em multi-buffer; cada hunk tem `Accept | Reject` button próprio. Inline edits no chat são MENU (lista de arquivos editados + counter), não preview gigante.
**Por que é premium**: separa "pensamento" do "review pesado". O chat fica legível, o diff vive na surface code real.
**Aplicação Atlas**: tool-call result no Atlas Code Programming = sumário (file count + line delta) com link `Ver diff` — abre painel lateral, não infla a mensagem.

### 2.9 · Vercel StatusDot (canonical semantic)

**Fonte**: [vercel.com/geist](https://vercel.com/geist) (Status Dot é componente nomeado)
**Descrição visual**: círculo 8-10px, cor sólida do hue (não filled+ring), label sans 13px ao lado. Variants: gray (idle), blue (info), amber (warning), green (success), red (error). Pulse animation opcional 1.6s `cubic-bezier(0.4, 0, 0.6, 1)` SÓ no state "running" — nunca em idle/done. Quando label é "Live", dot pulsa; quando "Ready", dot estático.
**Por que é premium**: vocabulário visual consistente, hierarchy de attention (pulse = need attention, estático = informação).
**Aplicação Atlas**: criar `<StatusDot state="running|done|error|blocked" />` reutilizável. Pulse apenas em `running` (canon: capítulo 0007 menciona "status dots ESTÁTICOS pulse halo cafona REMOVIDO" — confirma).

### 2.10 · Geist Badge → "subtle on neutral row"

**Fonte**: [vercel.com/geist/badge](https://vercel.com/geist/badge)
**Descrição visual**: badge dentro de uma row de tabela usa variant `*-subtle`, font sans 10-11px tracking 0.04em, padding 1px 6px, radius 3-4px. Quando há múltiplos badges em sequência, gap 4px. Cor mantém-se dessaturada — a tabela inteira parece de papel de cartório, não Discord.
**Por que é premium**: badges em tabela são metadata, não call-to-action. Saturação destruiria leitura horizontal.
**Aplicação Atlas**: todas as tabelas Atlas Code (lifecycle, evidence, decisions) usam badges `*-subtle`. Tokens já existem: `--cc-success-veil`, `--cc-warning-veil`, `--cc-danger-veil`.

---

## 3 · Top 5 anti-padrões a EVITAR

### 3.1 · Yellow saturado em header uppercase (SEO blog 2018)

**O que parece**: `<h3 style="color: #f1c40f; text-transform: uppercase; font-weight: 700">FEATURES</h3>` ou pílula amarela `background: #f1c40f; color: #000`.
**Por que é amador**: cor saturada em label estático = ruído permanente. Olho não consegue ignorar.
**Quem comete**: Bootstrap docs (até hoje), Material Design AlertDialog warning, qualquer SaaS afterthought.
**O que Atlas faz hoje (BUG)**: pílulas de código (`app/Services/Ai/Programming/Governance/`) parecem Bootstrap docs template. Tabelas com headers uppercase yellow looking SEO blog 2018.
**Fix**: ver recipe 4.3 (file path) e 4.7 (table header).

### 3.2 · Pílula colorida traffic-light para status

**O que parece**: `<span style="background: #2ecc71; color: white; border-radius: 999px; padding: 4px 12px">DONE</span>`.
**Por que é amador**: full-bg saturado consome attention de tudo ao redor; numa lista de 20 items vira piscina semafórica.
**Quem comete**: Bootstrap (estilo `.badge-success`), early-stage SaaS, Jira pre-redesign.
**Quem faz certo**: Linear (filled-circle icon, no bg), Vercel (StatusDot + label dim, bg só em variant subtle), Warp (sidebar stripe, NÃO bg).
**Fix**: ver recipe 4.4 (status indicator).

### 3.3 · Pink alarmista em destructive idle

**O que parece**: botão `Delete` com `background: #ff3366; color: white` mesmo em idle, sempre presente.
**Por que é amador**: confirma o medo do user que clique acidental destrói. Mas também cega o olho — em UI complexa, vira mancha visual permanente.
**Quem comete**: Tailwind-default destructive button, Material Design Snackbar action.
**Quem faz certo**: Linear (texto vermelho-muted em menu, confirm modal), GitHub (border vermelho ghost só em hover, depois solid em modal), Vercel (`type="error"` ghost com fg vermelho dessaturado).
**Fix**: ver recipe 4.5 (action button).

### 3.4 · File path como pílula preenchida grande

**O que parece**: `<span style="background: #fffbeb; border: 1px solid #f5a623; color: #92400e; padding: 4px 10px; border-radius: 6px; font-family: mono">app/Services/Ai/Programming/Governance/</span>`.
**Por que é amador**: file path NÃO é status nem call-to-action; é metadata localização. Pílula = elevação visual; localização não merece elevação. Quando há 5 paths numa mensagem, ficam todos competindo.
**O que Cursor faz** (premium): apenas mono 12px text-muted, talvez com `/` separator dim 50%, sem bg, sem border. Click revela popover ou jump.
**Fix**: ver recipe 4.2 (file path inline).

### 3.5 · Cursor's amateur tab status (criticized in community)

**Fonte**: [forum.cursor.com/t/tabs-layout-and-chat-position/131057](https://forum.cursor.com/t/tabs-layout-and-chat-position/131057), `cursor-modern-coding-ai-feedback-patterns.md` (research interno Atlas, "Cursor 3 tab status subtle, criticized")
**O que Cursor erra**: o status do agent (running/done) é comunicado por um dot minúsculo no tab title que mistura visualmente com o close-button. Em monitor de 4 agents simultâneos, o user NÃO consegue distinguir qual terminou.
**Por que é amador**: feedback channel insufficient. Warp resolveu com badge no tab + cor distinta + dock-bounce.
**Lição p/ Atlas**: status indicator de tool-call/agent NÃO pode ser meramente um dot tiny no canto. Deve usar canal redundante (dot + label + position).

---

## 4 · Recipes específicos para Atlas Code

> Todas as recipes assumem escopo `.atlas-shell.surface-code` (canon capítulo 16). Tokens `--cc-*` já existem; o trabalho é APLICAR consistentemente.

### 4.1 · Code chip (substituir pílula yellow atual)

**Quando usar**: identifier inline em mensagem (variable name, function name, class name, command, env var) — **não** file path, **não** status.

```tsx
// React
<code className="cc-chip-code">{identifier}</code>
```

```css
/* atlas-desktop/src/index.css @layer enterprise · surface-code scope */
.surface-code .cc-chip-code {
  display: inline-flex;
  align-items: center;
  vertical-align: baseline;
  font-family: var(--mono); /* JetBrains Mono / ui-monospace */
  font-size: 0.85em;        /* relativo ao parent — escala se parent for cormorant 18px */
  line-height: 1.4;
  padding: 0.05em 0.35em;
  margin: 0 0.05em;
  color: var(--cc-text-strong);            /* cool cream high-contrast */
  background: var(--cc-surface-raised);    /* slate teal raised */
  border: 1px solid var(--cc-border-soft); /* alpha 5% cream */
  border-radius: 3px;                      /* canon Atlas */
  font-feature-settings: 'liga' 0, 'calt' 1; /* mono ligatures off em chip pequeno */
}
.surface-code .cc-chip-code:hover {
  background: var(--cc-surface);
  border-color: var(--cc-border);
}
```

**Anti-canon**: NÃO usar yellow/amber bg, NÃO usar uppercase, NÃO usar font-size fixo (precisa escalar com parent).
**Diff vs hoje**: hoje (provável) está com `background: #fff8e1; border: 1px solid #f5a623; color: #92400e` ou similar. Trocar para slate-raised + cream-strong como acima.

### 4.2 · File path inline (Cursor/Linear pattern)

**Quando usar**: path tipo `app/Services/Ai/Programming/Governance/`, sempre que mencionar arquivo/diretório.

```tsx
<a className="cc-chip-path" href={`atlas://open/${path}`} title={path}>
  <FileIcon className="cc-chip-path__icon" />
  <span className="cc-chip-path__segments">
    {segments.map((seg, i) => (
      <Fragment key={i}>
        {i > 0 && <span className="cc-chip-path__sep">/</span>}
        <span className="cc-chip-path__seg">{seg}</span>
      </Fragment>
    ))}
  </span>
</a>
```

```css
.surface-code .cc-chip-path {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  vertical-align: baseline;
  font-family: var(--mono);
  font-size: 0.84em;
  line-height: 1.4;
  padding: 0;                              /* SEM padding — não é pílula */
  color: var(--cc-text-muted);             /* dim por default */
  text-decoration: none;
  border-radius: 2px;
}
.surface-code .cc-chip-path__icon {
  width: 12px; height: 12px;
  opacity: 0.6;
  flex-shrink: 0;
}
.surface-code .cc-chip-path__sep {
  color: var(--cc-text-faint);             /* /'s mais fracos que segments */
  margin: 0 0.05em;
  user-select: none;
}
.surface-code .cc-chip-path__seg:last-child {
  color: var(--cc-text);                   /* basename mais forte */
}
.surface-code .cc-chip-path:hover {
  color: var(--cc-text);
  text-decoration: underline;
  text-decoration-color: var(--cc-border);
  text-underline-offset: 2px;
}
.surface-code .cc-chip-path:hover .cc-chip-path__icon {
  opacity: 0.9;
}
```

**Anti-canon**: NÃO pílula com bg+border, NÃO uppercase, NÃO yellow.
**Por que funciona**: mono dim comunica "metadata"; basename em color mais forte vira anchor de leitura; click no chip leva ao arquivo.

### 4.3 · Function/identifier inline

**Quando usar**: nome de função, hook, type, class mencionado em prosa (`useCustomLayout()`, `Atom`, `cartographySurface`).

Mesma classe `.cc-chip-code` da recipe 4.1. Diferença é semântica:

```tsx
<code className="cc-chip-code cc-chip-code--fn">useCustomLayout</code>
<code className="cc-chip-code cc-chip-code--type">CartographySurface</code>
```

```css
.surface-code .cc-chip-code--fn::after {
  content: '()';
  color: var(--cc-text-muted);
  font-weight: 400;
}
.surface-code .cc-chip-code--type {
  /* type names em cool cream slight tinted accent */
  color: var(--cc-accent-strong); /* atlas gold burnished */
}
```

**Anti-canon**: NÃO uppercase, NÃO bold pesado, NÃO yellow gritante. Atlas gold só em type names (intencional: distingue tipo de função, sutil, premium).

### 4.4 · Status indicator (sem traffic light)

**Quando usar**: tool-call status, lifecycle phase, message kind. **NUNCA** pílula traffic-light.

```tsx
type StatusKind = 'idle' | 'running' | 'waiting' | 'done' | 'error' | 'blocked';

<StatusDot kind={kind} label={label} />
```

```tsx
// atlas-desktop/src/components/code/StatusDot.tsx
export function StatusDot({ kind, label }: { kind: StatusKind; label: string }) {
  return (
    <span className={`cc-status cc-status--${kind}`} role="status">
      <span className="cc-status__dot" aria-hidden />
      <span className="cc-status__label">{label}</span>
    </span>
  );
}
```

```css
.surface-code .cc-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--sans);
  font-size: 11.5px;
  letter-spacing: 0.01em;
  color: var(--cc-text-muted);
}
.surface-code .cc-status__dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--cc-text-faint);     /* default neutral */
  flex-shrink: 0;
  position: relative;
}
.surface-code .cc-status--idle    .cc-status__dot { background: var(--cc-text-faint); }
.surface-code .cc-status--waiting .cc-status__dot { background: var(--cc-info); }
.surface-code .cc-status--running .cc-status__dot { background: var(--cc-accent); }
.surface-code .cc-status--done    .cc-status__dot { background: var(--cc-success); }
.surface-code .cc-status--error   .cc-status__dot { background: var(--cc-danger); }
.surface-code .cc-status--blocked .cc-status__dot { background: var(--cc-warning); }

/* PULSE somente em running — canon Atlas (capítulo 17 codex slate premium) */
.surface-code .cc-status--running .cc-status__dot::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: var(--cc-accent);
  opacity: 0.4;
  animation: cc-status-pulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .surface-code .cc-status--running .cc-status__dot::before { animation: none; }
}
@keyframes cc-status-pulse {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50%      { transform: scale(1.8); opacity: 0; }
}

/* Label COLOR fica neutro — cor vive no dot, não no texto */
.surface-code .cc-status__label { color: inherit; }

/* Variant "strong" para casos onde o status É a informação primária — usa cor do hue como texto */
.surface-code .cc-status--strong.cc-status--error   .cc-status__label { color: var(--cc-danger); }
.surface-code .cc-status--strong.cc-status--done    .cc-status__label { color: var(--cc-success); }
.surface-code .cc-status--strong.cc-status--blocked .cc-status__label { color: var(--cc-warning); }
```

**Anti-canon**:
- NÃO `<span class="badge badge-success">DONE</span>` com fundo green saturado.
- NÃO pulse halo em estados idle/done (canon "pulse halo cafona REMOVIDO").
- NÃO uppercase no label (label é prosa: "concluído há 12s" não "DONE").

**Variant Warp sidebar-stripe** (para tool-call cards):

```css
.surface-code .cc-tool-card {
  position: relative;
  padding: 12px 14px 12px 16px;          /* extra left para stripe */
  background: var(--cc-surface);
  border: 1px solid var(--cc-border-soft);
  border-radius: 3px;
  border-left: 2px solid var(--cc-border); /* stripe idle */
}
.surface-code .cc-tool-card[data-status="running"] { border-left-color: var(--cc-accent); }
.surface-code .cc-tool-card[data-status="done"]    { border-left-color: var(--cc-success); }
.surface-code .cc-tool-card[data-status="error"]   {
  border-left-color: var(--cc-danger);
  background: linear-gradient(90deg, rgba(208, 90, 82, 0.05) 0%, var(--cc-surface) 60%);
}
```

### 4.5 · Action button (sem pink alarmista)

**Três níveis honestos**: primary, secondary, ghost. Destructive é variant ghost.

```tsx
<Button variant="primary">Apply changes</Button>
<Button variant="secondary">Review diff</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="ghost" tone="danger">Discard</Button>
```

```css
/* Base ---------------------------------------------------- */
.surface-code .cc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  font-family: var(--sans);
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.005em;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 180ms cubic-bezier(0.32, 0.72, 0.24, 1),
              border-color 180ms cubic-bezier(0.32, 0.72, 0.24, 1),
              color 180ms cubic-bezier(0.32, 0.72, 0.24, 1);
}
.surface-code .cc-btn:focus-visible {
  outline: 2px solid var(--cc-accent);
  outline-offset: 2px;
}
.surface-code .cc-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Primary -------------------------------------------------- */
.surface-code .cc-btn--primary {
  background: var(--cc-accent);             /* atlas gold burnished */
  color: #1a1208;                           /* dark contrast on gold */
  border-color: var(--cc-accent-strong);
}
.surface-code .cc-btn--primary:hover  { background: var(--cc-accent-strong); }
.surface-code .cc-btn--primary:active { background: #c79b4a; }   /* gold pressed */

/* Secondary ----------------------------------------------- */
.surface-code .cc-btn--secondary {
  background: var(--cc-surface);
  color: var(--cc-text);
  border-color: var(--cc-border);
}
.surface-code .cc-btn--secondary:hover {
  background: var(--cc-surface-raised);
  border-color: var(--cc-border-strong);
}

/* Ghost --------------------------------------------------- */
.surface-code .cc-btn--ghost {
  background: transparent;
  color: var(--cc-text-muted);
  border-color: transparent;
}
.surface-code .cc-btn--ghost:hover {
  background: var(--cc-surface);
  color: var(--cc-text);
}

/* Destructive tone (idle = ghost vermelho-muted apenas no fg) */
.surface-code .cc-btn--ghost[data-tone="danger"] {
  color: var(--cc-danger);
}
.surface-code .cc-btn--ghost[data-tone="danger"]:hover {
  background: rgba(208, 90, 82, 0.08);       /* danger veil */
  color: var(--cc-danger-fg, #f0aaa3);
}
/* Em modal de confirm o destructive vira primary com fundo danger */
.surface-code .cc-btn--primary[data-tone="danger"] {
  background: var(--cc-danger);
  color: #fff;
  border-color: var(--cc-danger);
}
```

**Anti-canon**:
- NÃO destructive solid vermelho saturado em idle (`background: #ff3366`) — só em modal de confirm.
- NÃO outline preto pesado em primary — atlas gold é o accent canon.
- NÃO emoji no label.

### 4.6 · Inline link (anchor sutil)

```css
.surface-code .cc-link {
  color: var(--cc-text);
  text-decoration: underline;
  text-decoration-color: var(--cc-border);
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
  transition: text-decoration-color 180ms ease;
}
.surface-code .cc-link:hover {
  text-decoration-color: var(--cc-accent);
}
```

Padrão Vercel/Linear: underline sutil sempre presente (não só em hover), color herda do texto, decoration troca de cor.

### 4.7 · Table

```tsx
<table className="cc-table">
  <thead>
    <tr><th>Phase</th><th>Status</th><th>Owner</th><th>Updated</th></tr>
  </thead>
  <tbody>
    <tr><td>Plan</td><td><StatusDot kind="done" label="approved" /></td><td>Atlas</td><td className="cc-table__time">12m ago</td></tr>
  </tbody>
</table>
```

```css
.surface-code .cc-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--sans);
  font-size: 13px;
  color: var(--cc-text);
}
.surface-code .cc-table thead th {
  font-family: var(--mono);            /* atlas canon: mono caps em eyebrows */
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.16em;              /* canon 1.4-2.4px */
  text-transform: uppercase;
  color: var(--cc-text-muted);         /* MUTED — NÃO yellow */
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--cc-border-soft);
}
.surface-code .cc-table tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--cc-border-soft);
  vertical-align: middle;
}
.surface-code .cc-table tbody tr:hover {
  background: rgba(233, 238, 242, 0.03);  /* neutral 3% alpha, jamais saturado */
}
.surface-code .cc-table tbody tr:last-child td {
  border-bottom: none;
}
.surface-code .cc-table__time {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--cc-text-faint);
  font-variant-numeric: tabular-nums;
}
/* Headers NUNCA usam fundo colorido. Border só horizontal. Linhas verticais proibidas. */
```

**Anti-canon**:
- NÃO `<th style="background: #f1c40f">` ou qualquer cor saturada no header.
- NÃO `border: 1px solid` em cada cell (vibe Bootstrap table).
- NÃO `tr:nth-child(even) { background: #f5f5f5 }` zebra-striped — densidade visual desnecessária.

### 4.8 · Section header

```tsx
<header className="cc-section-head">
  <span className="cc-section-head__eyebrow">obra · phase</span>
  <h3 className="cc-section-head__title">Plan & evidence</h3>
  <p className="cc-section-head__deck">Atlas review · readiness vs proven_delivery</p>
</header>
```

```css
.surface-code .cc-section-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--cc-border-soft);
  margin-bottom: 18px;
}
.surface-code .cc-section-head__eyebrow {
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.20em;
  color: var(--cc-text-muted);          /* MUTED, jamais yellow */
}
.surface-code .cc-section-head__title {
  /* Cormorant italic no surface code É opcional — canon menciona "Inter/system sans-serif protagonista" no code */
  font-family: var(--sans);
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: var(--cc-text-strong);
  margin: 0;
}
.surface-code .cc-section-head__deck {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--cc-text-muted);
  margin: 0;
}
```

**Anti-canon**:
- NÃO `<h3 class="text-2xl text-yellow-500 uppercase font-bold">` (vibe Bootstrap docs).
- NÃO uppercase no title (uppercase só em eyebrow).
- NÃO ornamental emoji.

---

## 5 · Tokens novos sugeridos para `--cc-*`

Adicionar ao `@layer tokens` dentro de `.atlas-shell.surface-code` no `index.css`:

```css
.atlas-shell.surface-code {
  /* Veils (background sutil para badges *-subtle pattern Geist) */
  --cc-success-veil: rgba(130, 181, 119, 0.12);
  --cc-warning-veil: rgba(224, 173, 94, 0.12);
  --cc-danger-veil:  rgba(208, 90, 82, 0.10);
  --cc-info-veil:    rgba(74, 106, 124, 0.12);
  --cc-accent-veil:  rgba(212, 168, 90, 0.12);     /* já existe */

  /* Subtle foreground (matching pairs para *-subtle Geist) */
  --cc-success-fg: #aed3a4;
  --cc-warning-fg: #ecc183;
  --cc-danger-fg:  #f0aaa3;
  --cc-info-fg:    #9cbac8;

  /* Surface code sidebar stripe (Warp pattern) */
  --cc-stripe-idle:    var(--cc-border);
  --cc-stripe-running: var(--cc-accent);
  --cc-stripe-done:    var(--cc-success);
  --cc-stripe-error:   var(--cc-danger);
  --cc-stripe-warning: var(--cc-warning);
}
```

---

## 6 · Checklist de migração visual

Antes de fechar PR de polish, conferir:

- [ ] Nenhuma pílula com bg saturado em estado idle (status, code chip, file path).
- [ ] Yellow saturado SÓ aparece em (a) accent canon `--cc-accent` em hover/focus de elementos primários, (b) status dot `running` (pulse), (c) primary CTA bg.
- [ ] Todas as tabelas têm header `mono uppercase 9.5px tracking 0.20em color: text-muted`.
- [ ] Todos os status indicators usam `<StatusDot />` (dot 6px + label sans), nunca pílula traffic-light.
- [ ] Destructive button em idle = ghost com fg vermelho-muted; só vira solid red em modal de confirm.
- [ ] File path inline usa `.cc-chip-path` (mono dim, sem bg, basename mais forte).
- [ ] Code/identifier inline usa `.cc-chip-code` (mono small, slate-raised bg, radius 3px).
- [ ] Tool-call cards têm `border-left: 2px` (Warp stripe) — color por status, jamais full-bg vermelho.
- [ ] Section headers: eyebrow mono caps muted + title sans medium — NÃO uppercase yellow.
- [ ] Row hover = neutral alpha 3-5%, nunca cor saturada.
- [ ] Pulse animation só em `running`, com `@media (prefers-reduced-motion: reduce)` honrado.
- [ ] Border-radius nunca passa de 4px (chip) / 6px (button) / 12px (modal/popover).
- [ ] Atlas canon capítulo 1 anti-canon respeitado (não Aesop/Hermès/Material/Bootstrap).

---

## 7 · Referências canon (priorizadas)

| Prioridade | Doc | Por quê |
|---|---|---|
| Alta | `docs/architecture/0007-atlas-desktop-design-system.md` capítulo 16 | Tokens `--cc-*` canon do surface code dark, anti-canon explícito |
| Alta | `docs/research/cursor-modern-coding-ai-feedback-patterns.md` | Matrix comparativa interna 13 produtos sobre status/feedback channels |
| Alta | [vercel.com/geist/badge](https://vercel.com/geist/badge) | Subtle pattern canonical (10 hues × subtle variant) |
| Alta | [linear.app/now/how-we-redesigned-the-linear-ui](https://linear.app/now/how-we-redesigned-the-linear-ui) | LCH color, density rules, muted authority |
| Alta | [docs.warp.dev/terminal/blocks/block-basics/](https://docs.warp.dev/terminal/blocks/block-basics/) | Sidebar stripe pattern para exit-code |
| Média | [cursor.com/changelog/2-0](https://cursor.com/changelog/2-0) | "inline pills" canon para file/dir mentions |
| Média | [blakecrosley.com/guides/design/arc](https://blakecrosley.com/guides/design/arc) | Command bar elevation pattern |
| Média | [zed.dev/docs/ai/agent-panel](https://zed.dev/docs/ai/agent-panel) | Multi-buffer Review Changes separation |
| Média | [manual.raycast.com/ai/chat](https://manual.raycast.com/ai/chat) | List-item accessory pattern |
| Baixa | [vercel.com/geist/colors](https://vercel.com/geist/colors), [seedflip.co/blog/vercel-design-system](https://seedflip.co/blog/vercel-design-system) | Hex values gray scale Geist (Atlas tem palette própria, mas serve de spacing/lightness reference) |
| Baixa | [warp.dev/blog/how-to-draw-styled-rectangles-using-the-gpu-and-metal](https://www.warp.dev/blog/how-to-draw-styled-rectangles-using-the-gpu-and-metal) | UI primitives filosofia (rectangle + glyph + icon) |

---

## 8 · Notas honestas e gaps

- **Linear** não publica design system completo; hex values exatos para Indigo/Woodsmoke/Oslo Gray são **inferidos** de redesign post + Mobbin (página retornou 403, então `[unconfirmed]`). Recomendação operacional: pegar hex via DevTools no app real.
- **Warp** documenta blocos genericamente mas não publica spec visual (corner radius, padding, exact stripe width) — descrições baseadas em screenshots públicos + interpretação de docs ([unconfirmed exact pixel values]).
- **Cursor v0.45 specific UI**: changelog não detalha visual; o que está catalogado vem de [cursor.com/changelog/2-0](https://cursor.com/changelog/2-0) (oct 2025 release que consolidou "inline pills"). Detalhes mais granulares (hover preview, hex bg do chip) requerem captura no app — pendente.
- **v0/Vercel chat panel** nova versão: blog post anuncia mudanças business mas omite design spec; recomendação: capturar via app v0.app/docs.
- **Raycast AI Chat** design só descrito em prosa; recomendação: capturar PNG do chat real.
- **Vercel Geist hex completo** para todas as 10 escalas (blue, red, amber, green, teal, purple, pink) não foi capturado nesta sweep — apenas gray scale. Para Atlas isso é OK (paleta própria), mas se quiser comparison side-by-side, abrir [geist.vercel.app/docs/colors](https://geist.vercel.app/docs/colors) (returned 404 nesta sweep, possível variant URL).
- **Cline/Continue** UI segue VS Code theme do user — pouca opinião visual própria; chat panel inherit é o pattern (não usar como referência de polish premium).
- Algumas tendências 2026 vistas em buscas paralelas (glassmorphism, gradient identity) NÃO estão em Atlas canon — manter Atlas canon (Don Corleone editorial slate + atlas gold burnished), não adotar essas trends.

---

## 9 · Próximos passos sugeridos

1. **Auditar componentes Atlas Code Programming hoje** (`atlas-desktop/src/surfaces/code/.../ProgrammingGovernance*`) procurando: (a) pílulas yellow saturadas, (b) tabelas com header colored, (c) destructive buttons solid red idle, (d) file paths como pílula preenchida.
2. **Criar branch `polish/code-surface-chips-2026-05`** e migrar incremental: recipe 4.1 (code chip) → 4.2 (file path) → 4.4 (status) → 4.5 (button) → 4.7 (table) → 4.8 (section header).
3. **Smoke test Playwright** após cada recipe (canon capítulo 19 do Atlas Design System).
4. **Capturar screenshots** antes/depois para o ledger visual (`atlas-tauri-size.mjs` canon — capítulo 19).
5. **Validar com o operador** (canon: honestidade 7.5/10) — não promete 9.5 antes de entregar.
