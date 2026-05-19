/**
 * Atlas Vox V6 · humanização da mensagem de erro do overlay.
 *
 * Função pura, sem JSX e sem `import.meta.env`, vive em arquivo próprio para
 * que possa ser carregada por testes (`npx tsx`) sem precisar do Vite. O
 * `VoxOverlay.tsx` re-exporta o mesmo símbolo para manter compatibilidade.
 *
 * Regra única: tudo que caísse no banner vermelho do operador como erro cru
 * (enum Rust, JSON do Laravel, stack trace, código técnico) precisa virar
 * frase PT-BR honesta antes de ser renderizado. Se nada bater, a string
 * original passa direto — assumindo que já é PT-BR humano.
 */

export function humanizeOverlayError(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null
  const trimmed = String(raw).trim()
  if (trimmed === '') return null
  const lowered = trimmed.toLowerCase()

  // Microfone sem permissão / sem áudio capturado.
  if (
    /microfone/i.test(trimmed)
    || /audioinputinvalid/i.test(trimmed)
    || /rms=0(?:\.0+)?/i.test(trimmed)
    || /peak=0(?:\.0+)?/i.test(trimmed)
    || /active_ratio=0(?:\.0+)?/i.test(trimmed)
    || /microphone\b/i.test(trimmed)
  ) {
    return 'O Atlas não recebeu áudio do microfone. Libere o microfone para Atlas Code em Ajustes do Sistema e grave de novo.'
  }

  // Hotkey / atalho.
  if (
    /hotkey/i.test(trimmed)
    || /accessibility/i.test(trimmed)
    || /input.monitoring/i.test(trimmed)
  ) {
    return 'O atalho global ainda não está liberado. Vá em Ajustes do Sistema > Privacidade e Segurança e libere Acessibilidade e Monitoramento de Entrada para Atlas Code.'
  }

  // Modelo de voz.
  if (
    /model.missing/i.test(trimmed)
    || /engine.binding/i.test(trimmed)
    || /whisper/i.test(trimmed)
  ) {
    return 'O modelo de voz local ainda não está pronto. Reabra o Atlas Desktop pelo comando Vox correto.'
  }

  // Servidor offline / fetch / 422 do Laravel.
  if (
    /fetch/i.test(trimmed)
    || /econn/i.test(trimmed)
    || /network/i.test(trimmed)
    || /timeout/i.test(trimmed)
    || /atlas[-_]server/i.test(trimmed)
    || /kernel\b/i.test(trimmed)
    || /\/ai\/vox\//i.test(trimmed)
  ) {
    return 'O servidor Atlas não respondeu. Confirme que ele está rodando e tente de novo.'
  }

  // Tauri / app desktop.
  if (/tauri/i.test(trimmed) || /mac.edge/i.test(trimmed)) {
    return 'Esta ação só funciona no Atlas Desktop. Abra o app desktop para continuar.'
  }

  // Stack trace / JSON cru de 422 / enum técnico — qualquer coisa com chaves,
  // colchetes ou prefixo Rust:: é substituída por mensagem honesta.
  if (
    lowered.includes('panic')
    || /\b[A-Z][a-zA-Z]+::[A-Z]/.test(trimmed)
    || /^\s*\{/.test(trimmed)
    || /^\s*\[/.test(trimmed)
    || /^error:/i.test(trimmed)
  ) {
    return 'Algo deu errado dentro do Atlas Vox. Tente gravar de novo. Se persistir, abra Detalhes avançados > Diagnóstico.'
  }

  return trimmed
}
