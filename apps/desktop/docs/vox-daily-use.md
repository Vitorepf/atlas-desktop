# Atlas Vox V6 · uso diário

Guia curto em PT-BR. Tudo local, sem API paga. Sem `sudo`.

---

## Como usar agora

Em um terminal, dentro de `atlas-desktop`:

```sh
npm run vox:dev --workspace=@atlas/desktop
```

Esse comando sobe o servidor local, abre o Atlas Code com voz pronta e
encerra tudo limpo no `Ctrl+C`.

Para gravar:

1. Em qualquer janela do Atlas Code, pressione **⌥ Espaço**.
2. Fale.
3. Pressione **⌥ Espaço** de novo ou **Enter** para finalizar.
4. Revise o texto e clique no botão principal verde.

Pronto. Esse é o caminho diário.

---

## Atalhos

| Tecla | O que faz |
|---|---|
| **⌥ Espaço** | Abre, grava ou finaliza, conforme o estado atual |
| **Enter** | Finaliza quando o painel está em "Atlas ouvindo" |
| **Esc** | Cancela a gravação ou fecha o painel |
| **Parar tudo** (botão discreto) | Encerra com segurança e libera o microfone |

"Parar tudo" é o botão de emergência. Use quando algo travar.

---

## Os 4 modos

O Atlas escolhe sozinho (modo automático). Você pode trocar manualmente
em **Trocar modo** dentro do painel de revisão.

| Modo | Para quê |
|---|---|
| **Ditado** | Sua fala vira texto literal no campo ativo. |
| **Melhorar** | Limpa e organiza o texto que você ditou antes de inserir. |
| **Criar prompt** | Transforma sua fala num prompt forte para Codex ou Claude. |
| **Executar** | Pede ao Atlas para agir, sempre com uma confirmação humana antes. |

Em **Executar**, ações destrutivas (apagar arquivos, comandos perigosos)
exigem que você digite uma frase literal para liberar. O Atlas nunca roda
nada por conta própria.

---

## AirPods e outros microfones

O Atlas Vox **sempre usa a entrada de áudio selecionada no macOS** — não
há configuração separada por dispositivo. Se o macOS está ouvindo os
AirPods, o Atlas ouve os AirPods. Se você trocou para o built-in da
MacBook, o Atlas usa o built-in. O Atlas **não dá preferência** a marca
ou modelo: AirPods, Yeti, MacBook, Loopback — todos funcionam igual
desde que o macOS os reconheça como entrada padrão.

Para trocar:

1. **Ajustes do Sistema → Som → Entrada** e clique no dispositivo que quer.
2. Ou clique no ícone de som na barra de menu (segurando ⌥ Option) e
   escolha em "Microfone de entrada".
3. Volte ao Atlas Code. Não precisa reabrir.

Se acabou de conectar os AirPods e a primeira gravação saiu vazia, o
macOS provavelmente ainda está roteando pro built-in. Confira a entrada
antes de apertar ⌥ Espaço de novo.

Se só ouvir silêncio, confira que os AirPods aparecem em **Entrada** (não
só em Saída) e que o **Atlas Code** está ligado em
**Privacidade e Segurança → Microfone**.

---

## Se aparecer "Não recebi áudio"

Mensagem canônica quando a captura volta vazia:

> **Não recebi áudio. Confira se o microfone certo está selecionado no
> macOS e tente de novo.**

Checklist rápido (30 segundos):

1. **Ajustes do Sistema → Som → Entrada** — o dispositivo certo está
   destacado?
2. Fale no microfone e veja se a barra de nível **se mexe** ali na tela
   de Som. Se não mexe, não vai mexer no Atlas.
3. Se está usando AirPods e o nível não mexe, **tire e recoloque** os
   fones. Às vezes o macOS troca o perfil pra "saída-só" automaticamente
   quando outro app (Zoom, Meet) abre antes.
4. Volte ao Atlas Code e aperte ⌥ Espaço.

A UI principal **nunca mostra** rms, peak ou active_ratio — esses são
detalhes técnicos. Se precisar inspecionar, rode `npm run vox:doctor` e
abra o manifest JSON em `test-results/vox-doctor/manifest.json`.

---

## Se o microfone pedir permissão

1. Clique em **Permitir** na caixa de diálogo do macOS.
2. Confirme em **Ajustes do Sistema → Privacidade e Segurança → Microfone**
   que **Atlas Code** está ligado.
3. Volte ao Atlas Code e aperte ⌥ Espaço.

### Por que o macOS volta a pedir permissão "do nada"

A permissão é amarrada à **assinatura do binário**, não ao nome do app.
Dois cenários comuns que disparam a caixa de novo:

- **Alternou entre dev e release**: `npm run tauri:dev` usa o binário em
  `target/debug/`. O `Atlas Code.app` empacotado vive em
  `target/release/bundle/macos/`. Para o macOS são apps diferentes.
- **Re-empacotou o `.app`**: cada `tauri build` muda o hash do binário e
  o macOS pode pedir de novo.

**Como evitar:** rode `npm run tauri:build:vox --workspace=@atlas/desktop`
uma vez, mova o `.app` resultante para `/Applications/Atlas Code.app` e
use sempre o mesmo binário pro dogfood diário. Mantém a assinatura
estável (`Atlas Local Code Signing`) e a permissão sobrevive entre
sessões. O `npm run vox:doctor` valida isso no check `app_bundle_estavel`.

Nunca rode `sudo tccutil reset Microphone` — apaga a permissão de TODOS
os apps da máquina, não só do Atlas.

---

## Como saber se está tudo certo

Um comando, em PT-BR, sem expor token ou caminho sensível:

```sh
VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:doctor --workspace=@atlas/desktop
```

9 checks. Cada falha mostra o próximo passo concreto. Resultado possível:

- **PASS** — pode gravar.
- **WARN** — usável, tem ponto a ajustar.
- **FAIL** — algo crítico. Resolva antes de tentar.

Quando algo parecer estranho no overlay, rode esse comando antes de
qualquer outra coisa.

---

## Segurança

- Sem API paga obrigatória — tudo roda local com Whisper no seu Mac.
- Áudio bruto **nunca é salvo**, em nenhum estado.
- Comandos perigosos **não rodam sozinhos**. Em modo Executar com risco
  alto, o Atlas exige que você digite uma frase literal para liberar.
- O token de acesso ao servidor local **nunca aparece** em log, terminal
  ou relatório.

---

## O que não está nesta fase

O Atlas Vox V6 é uma cabine curta no Mac. O que não está aqui:

- **iPhone / mobile** — Vox V6 é Mac/Desktop.
- **Voz contínua (Voice Realtime)** — pausada por decisão de doutrina.
- **Memória longitudinal (V7)** — fica para depois. O Vox V6 só lembra
  o que está acontecendo nessa sessão; nada entre dias.

V7 só destrava por decisão humana com nova ADR. Não destrava sozinho,
mesmo que o release-check feche tudo verde.

---

## Checklist final · uso pronto

Antes de declarar "Atlas Vox V6 pronto pra usar todo dia", os três
comandos abaixo precisam fechar em PASS:

```sh
# 1. Diagnóstico de máquina
VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:doctor --workspace=@atlas/desktop

# 2. Release-check completo (build + smokes + muralha de regressão)
VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:release-check --workspace=@atlas/desktop

# 3. Certificação final (release-check + cert oficial do servidor)
VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:v6-certify --workspace=@atlas/desktop
```

Resultado esperado nos três: `status=pass`.

Se algum fechar em `warn` ou `fail`, abra o resumo no terminal — cada
linha tem a próxima ação concreta em PT-BR.

---

## Referências curtas

- Primeira instalação (Whisper, PHP, cmake, permissões macOS):
  `apps/desktop/docs/vox-first-use.md`
- O que o release-check verifica:
  `apps/desktop/docs/vox-release-check.md`
- Camada Ambient (Option+Space com o app fechado):
  `docs/vox/AMBIENT-MAC.md`
