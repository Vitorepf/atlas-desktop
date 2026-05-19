# Como usar o Atlas Vox V4 (PT-BR) · HISTÓRICO

> **Doc histórica.** O Atlas Vox está em V6.
>
> **Use:** `apps/desktop/docs/vox-daily-use.md` — guia curto Atlas Vox V6.
>
> Detalhes históricos sobre o overlay V4 ficam abaixo só por referência;
> rótulos, atalhos e mensagens podem ter mudado no V6 e este arquivo
> não acompanha mais.

---

## Em uma frase

**Aperte `⌥ Espaço`, fale, solte. O Atlas entende e te mostra o que vai
fazer. Você confirma.**

---

## Fluxo principal · 3 passos

1. **Gravar.** Pressione `⌥ Espaço` em qualquer lugar do Atlas Desktop.
   Aparece o painel "Atlas Vox" com "Atlas ouvindo".
2. **Atlas entendeu.** Solte `⌥ Espaço` (ou pressione Enter / Option+Space
   de novo). O Atlas transcreve sua fala, decide sozinho o melhor modo
   (Ditado · Melhorar · Criar prompt · Executar) e te mostra em PT-BR o
   que entendeu.
3. **Confirmar.** Clique em **Confirmar** (ou `Cmd+Enter`). O resultado
   cai no composer do Atlas AI. Você revisa e segue.

Se errou algo: clique **Gravar de novo** — sem fechar o painel.

---

## Atalhos do Mac

| Tecla              | O que faz                                                |
|--------------------|----------------------------------------------------------|
| `⌥ Espaço`         | Gravar / parar de gravar (funciona com Atlas no fundo)   |
| `Enter`            | Finaliza a gravação atual                                |
| `Esc`              | Cancela a gravação atual ou fecha o painel               |
| `Cmd+Enter`        | Confirma o que o Atlas entendeu                          |
| `Cmd+Shift+Espaço` | Abre o painel Vox sem gravar (modo "só ver")             |
| `Esc Esc` rápido   | Modo seguro · interrompe gravação e limpa tudo na hora   |

---

## Quando aparecer um erro

O Atlas só mostra mensagens humanas — nada de stack trace, JSON ou enum
do Rust. Os erros mais comuns:

- **"Atlas não recebeu áudio do microfone."** Vá em
  *Ajustes do Sistema · Privacidade e Segurança · Microfone* e libere
  Atlas Code. Volte e grave de novo.
- **"O atalho global ainda não está liberado."** Mesmo caminho, mas em
  *Acessibilidade* e *Monitoramento de Entrada*. Atlas Code precisa estar
  marcado nas duas.
- **"O servidor Atlas não respondeu."** O `atlas-server` precisa estar
  rodando localmente. Rode `php artisan serve --port=8001` na pasta
  `atlas-server` e configure `VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001`.
- **"O modelo de voz local ainda não está pronto."** Você abriu o app
  pelo caminho errado. Use `npm run tauri:dev:vox` (dev) ou o build com
  whisper-cpp habilitado.

Cada erro tem um botão claro de "Gravar de novo" — o overlay não fecha
sozinho.

---

## Quatro modos que o Atlas escolhe por você

O default V4 é **Automático**. Você não precisa pensar em modo nenhum.
Quando o Atlas decide, ele anuncia em PT-BR na cabine "Atlas entendeu":

- **Ditado** · vira texto literal no composer. Pra anotação rápida.
- **Melhorar** · limpa, pontua e ajeita o texto antes de inserir.
- **Criar prompt** · transforma sua fala num prompt mais forte (Codex /
  Claude). Bom pra pedir trabalho técnico ao Atlas Dev.
- **Executar** · revisa o risco antes de qualquer ação real. Em risco
  R4, o Atlas exige que você digite uma frase literal.

Discorda da escolha do Atlas? Clique **Trocar modo** dentro da cabine
"Atlas entendeu". O Atlas registra que foi override manual (telemetria
honesta — você decide).

---

## Privacidade

- Áudio bruto **não é salvo** em nenhuma rodada.
- O Atlas **não lê o clipboard** sozinho, **não tira screenshot**, **não
  usa AppleScript**, **não pede Full Disk Access**.
- O contexto (workspace ativo, thread selecionada, texto selecionado
  dentro do app) é montado pelo Atlas Desktop e enviado ao servidor
  Atlas só quando faz sentido (Criar prompt / Executar). Em Ditado e
  Melhorar nada de contexto vai junto.
- O Atlas Vox **nunca executa terminal por conta própria**. Quando
  decide propor um comando, ele te mostra o texto pra você copiar e
  rodar manualmente.

---

## Quando algo não tá funcionando

Abra `Detalhes avançados > Diagnóstico` dentro do painel Vox. Lá fica o
checklist completo (microfone, atalho, modelo, servidor, executores)
com botões diretos pra abrir Ajustes do Sistema na seção certa. Cada
item tem cor, status em PT-BR e ação recomendada.

Pra rodar o release-check da máquina inteira:

```sh
cd atlas-desktop/apps/desktop
npm run vox:release-check
```

O resultado fica em `test-results/vox-release-check/manifest.json`.

---

## O que o Vox V4 NÃO faz

- Não substitui o Voice Realtime (conversa contínua). Voice Realtime
  segue pausada até V6 — esta cabine é a porta de entrada por gesto
  curto.
- Não roda no navegador / modo dev sem Tauri (gravação real exige o app
  desktop).
- Não usa API paga.
- Não monitora seu microfone enquanto o painel está fechado.

---

Versão: V4 (2026-05-19). Canon vivo em `docs/contracts/vox/` na raiz do
repositório Atlas.
