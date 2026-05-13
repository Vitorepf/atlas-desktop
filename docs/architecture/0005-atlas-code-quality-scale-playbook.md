# ADR-0005 · Atlas Code Quality and Scale Playbook

Status: accepted · 2026-05-13

Este playbook define como o Atlas Code deve crescer com seguranca, qualidade e
escala. Ele complementa o ADR-0004: o ADR-0004 define a arquitetura da tela; este
documento define o processo de evolucao para nao quebrar a cabine operacional.

Frase canonica:

```text
Toda feature nova precisa declarar owner, fonte de verdade, protocolo de estado,
estado vazio, estado de erro, teste e impacto no shell.
```

## Regra de ouro

Se uma mudanca deixa o operador sem saber se o Atlas esta executando, pronto,
falhou, aguardando assinatura, sem fonte ou degradado, a mudanca nao esta pronta.

## Owners arquiteturais

| Owner | Pasta | Responsabilidade |
|---|---|---|
| Shell | `apps/desktop/src/shell/` | moldura global, topbar, surface host, diagnostico global |
| Code surface | `apps/desktop/src/surfaces/code/` | cabine de programacao, obras, palco, governanca, terminal |
| Cartografia surface | `apps/desktop/src/components/cartografia/` | navegacao da verdade repo/vault |
| Bridge | `apps/desktop/src/lib/bridge.ts` + `crates/atlas-bridge/` | contratos com atlas-server |
| Platform | `crates/atlas-platform/` | PTY, filesystem, macOS local |
| Tauri | `crates/atlas-tauri/` | comandos nativos e lifecycle do app |
| Domain | `packages/atlas-domain/` | tipos compartilhados e contratos de payload |
| Legacy facades | `apps/desktop/src/components/` | re-export/compatibilidade, nao feature nova |

## Fluxo obrigatorio para feature nova

1. Identificar owner.
   A feature pertence a shell, Code, Cartografia, bridge, platform, Tauri ou
   domain. Se a resposta for "components", a arquitetura esta errada.

2. Declarar fonte de verdade.
   Kernel, atlas-server, PTY, filesystem, repo docs, AtlasVault, MCP, Ledger ou
   estado local. Toda fonte precisa ter erro/degradacao.

3. Escolher slot ou registry.
   - Navegacao esquerda: `leftRailRegistry`.
   - Painel direito: `rightRailRegistry`.
   - Palco principal: `mainStageRegistry`.
   - Terminal: `terminal/`.
   - Global: `shell/topbar` ou surface nova.

4. Definir estados.
   Toda feature precisa de `loading`, `empty`, `ready`, `degraded`, `failed` e,
   quando aplicavel, `running`.

5. Definir acao de recuperacao.
   Estado de erro sem proxima acao e apenas decoracao de erro.

6. Adicionar teste/check.
   No minimo `npm run build` e `git diff --check`. Se tocar Rust/PTY, teste
   Rust especifico. Se tocar contrato de payload, validar shape.

## Contrato de import

Permitido:

```text
App -> shell
shell -> surfaceRegistry / topbar / SurfaceHost
SurfaceHost -> surfaces/*
surfaces/code -> seus modulos internos, state, hooks, domain, bridge
components -> shell/surfaces como fachada legada
```

Proibido:

```text
surfaces/code -> components/*
shell -> surfaces/code internals
component visual -> backend direto sem bridge
panel -> manipular grid global
terminal visual -> criar PTY duplicado
```

## Contrato visual

- A tela deve continuar editorial cream, mas isso nao pode reduzir clareza.
- Texto operacional precisa caber em desktop real, sem overflow acidental.
- `Plan / Verify / Evidence` sao permanentes.
- Composer e terminal sao superficies de comando; nao podem virar decoracao.
- Terminal lateral nunca substitui a coluna direita; entra abaixo dela.
- Estados importantes devem ter cor, texto e fonte de autoridade.

## Contrato de dados

| Dado | Pode ser mock? | Regra |
|---|---|---|
| Obras | Nao | vem do atlas-server |
| Conversas | Nao | vem de thread/trace real |
| Receipt | Nao | vem do Kernel/decision payload |
| Gates | Nao | vem de tools/gates reais |
| Evidence | Nao | vem do Ledger/server |
| Terminal output | Nao | vem do PTY |
| Cartografia | Nao | vem de repo docs + Vault |
| Visual placeholder | Sim | somente se rotulado como empty/demo/fixture |

## Contrato do terminal

Terminal e produto central, nao widget.

Todo comando precisa deixar tres coisas claras:

- se esta rodando;
- se terminou e qual exit code;
- se a linha de input ja esta pronta.

Estados canonicos:

| Estado | Fonte |
|---|---|
| `running` | OSC `C` |
| `command-finished` | OSC `D;exit` |
| `prompt-started` | OSC `A` |
| `input-ready` | OSC `B` |
| `failed` | `D;exit != 0` |
| `dead` | evento PTY exit |

Regra: o frontend pode forcar refresh/scroll/focus, mas nao pode escrever prompt
falso no buffer.

## Contrato de qualidade antes de merge

Obrigatorio:

```bash
npm run build
git diff --check
```

Obrigatorio se tocar `crates/atlas-platform` ou terminal PTY:

```bash
cargo test -p atlas-platform pty_echoes_written_input_back_to_output_channel -- --nocapture
```

Obrigatorio se tocar Tauri/Rust mais amplo:

```bash
cargo check --workspace
```

Obrigatorio se tocar contrato visual sensivel:

- abrir a tela localmente;
- validar Code e Cartografia;
- validar terminal bottom/right;
- validar TopBar com kernel pronto/falhou quando possivel.

## Checklist de revisao humana

- A feature entra no lugar certo?
- Existe fonte de verdade clara?
- Existe estado vazio honesto?
- Existe erro acionavel?
- Existe degradacao segura?
- Existe teste/check proporcional ao risco?
- A UI nao perdeu espaco essencial?
- O terminal nao ficou ambiguo?
- A Cartografia nao virou fonte paralela?
- O Desktop nao duplicou decisao que pertence ao Kernel?

## Proximos alvos de endurecimento

1. Remover estilos inline restantes dos panels de Code.
2. Criar testes unitarios para `oscParser` com `A/B/C/D`.
3. Criar regressao manual documentada para terminal: `ls`, `cd`, `zi`, `false`,
   `sleep 2`, comando com muita saida.
4. Criar `panelStore` antes de adicionar layouts persistidos complexos.
5. Tipar contratos de `/atlas-code/*` no `packages/atlas-domain`.
6. Adicionar visual QA para dock bottom/right.
7. Formalizar actions destrutivas: confirmacao, receipt ou policy gate.

