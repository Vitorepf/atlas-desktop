/**
 * usePty · React-friendly PTY wrapper around atlas-tauri commands.
 *
 * Ownership:
 *   - One PTY per hook instance (so the TerminalDock owns one shell).
 *   - When the PTY opens, the hook subscribes to `pty://data/{id}` events
 *     and feeds them into an `onData(text)` callback.
 *   - `write(input)` and `resize(cols, rows)` round-trip to the master PTY.
 *
 * If the native bridge isn't reachable (HTTP/offline mode), `available`
 * stays false and `lastError` carries the reason — the UI renders an
 * honest "PTY unavailable" state without a fake terminal.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { bridge } from '../lib/bridge'

export interface PtyOptions {
  id?: string
  cwd?: string
  shell?: string
  cols?: number
  rows?: number
  /** Required: receives raw stdout chunks from the PTY. */
  onData: (chunk: string) => void
  onExit?: () => void
}

export interface UsePtyResult {
  id: string | null
  spawned: { id: string; shell: string; cwd: string; cols: number; rows: number } | null
  ready: boolean
  available: boolean
  lastError: string | null
  open: () => Promise<{ id: string; shell: string; cwd: string; cols: number; rows: number } | null>
  write: (data: string) => Promise<void>
  resize: (cols: number, rows: number) => Promise<void>
  close: () => Promise<void>
}

export function usePty(opts: PtyOptions): UsePtyResult {
  const [id, setId] = useState<string | null>(null)
  const [spawned, setSpawned] = useState<{ id: string; shell: string; cwd: string; cols: number; rows: number } | null>(null)
  const [available] = useState<boolean>(bridge.mode === 'tauri')
  const [lastError, setLastError] = useState<string | null>(null)
  const onDataRef = useRef(opts.onData)
  const onExitRef = useRef(opts.onExit)
  const idRef = useRef<string | null>(null)
  const spawnedRef = useRef<{ id: string; shell: string; cwd: string; cols: number; rows: number } | null>(null)
  const pendingWritesRef = useRef<string[]>([])
  const dataUnsubRef = useRef<(() => void) | null>(null)
  const exitUnsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    onDataRef.current = opts.onData
  }, [opts.onData])
  useEffect(() => {
    onExitRef.current = opts.onExit
  }, [opts.onExit])

  const open = useCallback(async () => {
    if (!available) {
      setLastError('PTY available only in Atlas Code .app (Tauri)')
      return null
    }
    try {
      const targetId = opts.id ?? globalThis.crypto?.randomUUID?.() ?? `pty-${Date.now()}`
      idRef.current = targetId
      setId(targetId)

      const eventApi = await import('@tauri-apps/api/event')
      if (!dataUnsubRef.current) {
        dataUnsubRef.current = await eventApi.listen<{ id: string; data: string }>(
          `pty://data/${targetId}`,
          (e) => {
            onDataRef.current(e.payload.data)
          },
        )
      }
      if (!exitUnsubRef.current) {
        exitUnsubRef.current = await eventApi.listen<{ id: string }>(
          `pty://exit/${targetId}`,
          () => {
            onExitRef.current?.()
          },
        )
      }

      const sp = await bridge.ptyOpen({
        id: targetId,
        cwd: opts.cwd,
        shell: opts.shell,
        cols: opts.cols ?? 120,
        rows: opts.rows ?? 36,
      })
      idRef.current = sp.id
      spawnedRef.current = sp
      setId(sp.id)
      setSpawned(sp)
      setLastError(null)

      const pending = pendingWritesRef.current.splice(0)
      for (const chunk of pending) {
        await bridge.ptyWrite(sp.id, chunk)
      }

      return sp
    } catch (e) {
      idRef.current = null
      spawnedRef.current = null
      setId(null)
      setLastError(e instanceof Error ? e.message : String(e))
      return null
    }
  }, [available, opts.id, opts.cwd, opts.shell, opts.cols, opts.rows])

  const write = useCallback(async (data: string) => {
    const currentId = idRef.current
    if (!currentId || !spawnedRef.current) {
      pendingWritesRef.current.push(data)
      setLastError(null)
      return
    }
    try {
      await bridge.ptyWrite(currentId, data)
      setLastError(null)
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  const resize = useCallback(async (cols: number, rows: number) => {
    const currentId = idRef.current
    if (!currentId) return
    await bridge.ptyResize(currentId, cols, rows)
  }, [])

  const close = useCallback(async () => {
    const currentId = idRef.current
    if (currentId) {
      try { await bridge.ptyClose(currentId) } catch { /* idempotent */ }
    }
    if (dataUnsubRef.current) dataUnsubRef.current()
    if (exitUnsubRef.current) exitUnsubRef.current()
    dataUnsubRef.current = null
    exitUnsubRef.current = null
    idRef.current = null
    spawnedRef.current = null
    pendingWritesRef.current = []
    setId(null)
    setSpawned(null)
  }, [])

  useEffect(() => {
    return () => {
      if (dataUnsubRef.current) dataUnsubRef.current()
      if (exitUnsubRef.current) exitUnsubRef.current()
      const currentId = idRef.current
      if (currentId) {
        void bridge.ptyClose(currentId).catch(() => undefined)
      }
      spawnedRef.current = null
      pendingWritesRef.current = []
    }
  }, [])

  return {
    id,
    spawned,
    ready: !!spawned,
    available,
    lastError,
    open,
    write,
    resize,
    close,
  }
}
