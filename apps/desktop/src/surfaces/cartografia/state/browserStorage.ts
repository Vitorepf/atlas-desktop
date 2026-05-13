export function readCartografiaStorage(key: string): string | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeCartografiaStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Persistencia local ajuda, mas nunca pode quebrar a Cartografia.
  }
}
