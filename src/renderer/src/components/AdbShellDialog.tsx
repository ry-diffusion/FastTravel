import React, { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogActions
} from '@fluentui/react-components'
import AdbShortcuts from './AdbShortcuts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  command: string
  output: string | null
  error?: boolean
  /** rendered output (grows char-by-char via typing animation) */
  rendered?: string
  /** typing animation complete */
  typingDone?: boolean
}

interface AdbShellDialogProps {
  deviceId: string
  isOpen: boolean
  onDismiss: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NEON = 'var(--vrcd-neon)'
const NEON_DIM = 'rgba(var(--vrcd-neon-raw),0.35)'
const NEON_DIM2 = 'rgba(var(--vrcd-neon-raw),0.18)'
const BG_SURFACE = '#1c1e23'
const BG_TERMINAL = '#15161a'

// ─── Typing animation hook ────────────────────────────────────────────────────

const INSTANT_THRESHOLD = 200

function useTypingAnimation(
  history: HistoryEntry[],
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>
): void {
  // Watch for new entries that haven't been typed yet
  useEffect(() => {
    const lastIdx = history.length - 1
    if (lastIdx < 0) return
    const last = history[lastIdx]
    if (last.typingDone || last.rendered !== undefined) return
    if (last.output === null) {
      setHistory((prev) =>
        prev.map((e, i) => (i === lastIdx ? { ...e, rendered: '', typingDone: true } : e))
      )
      return
    }

    const full = last.output
    if (full.length > INSTANT_THRESHOLD) {
      // Show instantly
      setHistory((prev) =>
        prev.map((e, i) => (i === lastIdx ? { ...e, rendered: full, typingDone: true } : e))
      )
      return
    }

    // Type char by char
    let charIdx = 0
    let cancelled = false

    const step = (): void => {
      if (cancelled) return
      charIdx++
      const slice = full.slice(0, charIdx)
      setHistory((prev) =>
        prev.map((e, i) =>
          i === lastIdx
            ? { ...e, rendered: slice, typingDone: charIdx >= full.length }
            : e
        )
      )
      if (charIdx < full.length) {
        const delay = 8 + Math.random() * 4  // 8-12 ms
        setTimeout(step, delay)
      }
    }

    const delay = 8 + Math.random() * 4
    const t = setTimeout(step, delay)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length])
}

// ─── Styles (inline, no makeStyles needed) ───────────────────────────────────

const S = {
  surface: {
    background: BG_SURFACE,
    border: `1px solid rgba(var(--vrcd-neon-raw),0.4)`,
    minWidth: '760px',
    maxWidth: '1100px',
    padding: '0',
    boxShadow: '0 0 40px rgba(var(--vrcd-neon-raw),0.08), 0 0 80px rgba(var(--vrcd-neon-raw),0.04)',
    borderRadius: '6px',
    overflow: 'hidden'
  } as React.CSSProperties,

  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    padding: 0
  } as React.CSSProperties,

  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px 10px',
    borderBottom: `1px solid ${NEON_DIM}`,
    background: 'rgba(0,0,16,0.8)'
  } as React.CSSProperties,

  titleText: {
    fontFamily: "var(--vrcd-font-mono)",
    fontSize: '13px',
    color: NEON,
    letterSpacing: '0.08em',
    textShadow: `0 0 10px ${NEON}`,
    userSelect: 'none' as const
  } as React.CSSProperties,

  content: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  } as React.CSSProperties,

  terminal: {
    background: BG_TERMINAL,
    border: `1px solid ${NEON_DIM}`,
    borderRadius: '4px',
    fontFamily: "var(--vrcd-font-mono)",
    fontSize: '13px',
    color: NEON,
    padding: '12px 14px',
    height: '360px',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    cursor: 'text'
  } as React.CSSProperties,

  outputText: {
    color: NEON,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
    textShadow: `0 0 6px rgba(var(--vrcd-neon-raw),0.5)`
  } as React.CSSProperties,

  errorText: {
    color: '#ff4444',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
    textShadow: '0 0 6px rgba(255,60,60,0.5)'
  } as React.CSSProperties,

  emptyHint: {
    color: 'rgba(var(--vrcd-neon-raw),0.4)',
    fontStyle: 'italic' as const,
    fontFamily: "var(--vrcd-font-mono)"
  } as React.CSSProperties,

  prompt: {
    color: NEON,
    textShadow: `0 0 8px ${NEON}`,
    userSelect: 'none' as const,
    marginRight: '6px'
  } as React.CSSProperties,

  commandText: {
    color: '#a8ffb0',
    textShadow: '0 0 4px rgba(168,255,176,0.4)'
  } as React.CSSProperties,

  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: BG_TERMINAL,
    border: `1px solid ${NEON_DIM}`,
    borderRadius: '4px',
    padding: '6px 12px'
  } as React.CSSProperties,

  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    padding: '10px 20px 16px',
    borderTop: `1px solid ${NEON_DIM2}`
  } as React.CSSProperties,

  neonBtn: {
    background: 'transparent',
    border: `1px solid ${NEON_DIM}`,
    color: NEON,
    fontFamily: "var(--vrcd-font-mono)",
    fontSize: '12px',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    padding: '5px 16px',
    borderRadius: '3px',
    transition: 'border-color 0.15s, box-shadow 0.15s, color 0.15s'
  } as React.CSSProperties,

  neonBtnHover: {
    borderColor: NEON,
    boxShadow: `0 0 8px rgba(var(--vrcd-neon-raw),0.4)`,
    color: '#ccffcc'
  } as React.CSSProperties
}

// ─── NeonButton ───────────────────────────────────────────────────────────────

function NeonButton({
  children,
  onClick,
  disabled
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}): React.ReactElement {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      style={{
        ...S.neonBtn,
        ...(hovered && !disabled ? S.neonBtnHover : {}),
        ...(disabled ? { opacity: 0.35, cursor: 'not-allowed' } : {})
      }}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )
}

// ─── FlashInput ───────────────────────────────────────────────────────────────
// Wraps a plain <input> and flashes the last typed character on each keystroke.

interface FlashInputProps {
  value: string
  onChange: (val: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  disabled?: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
}

function FlashInput({ value, onChange, onKeyDown, disabled, inputRef }: FlashInputProps): React.ReactElement {
  const [flash, setFlash] = useState(false)
  const [flashKey, setFlashKey] = useState(0)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(e.target.value)
    // Trigger flash on character addition
    if (e.target.value.length > value.length) {
      setFlash(false)
      requestAnimationFrame(() => {
        setFlashKey((k) => k + 1)
        setFlash(true)
        setTimeout(() => setFlash(false), 150)
      })
    }
  }

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder="enter shell command..."
        spellCheck={false}
        autoComplete="off"
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: "var(--vrcd-font-mono)",
          fontSize: '13px',
          color: NEON,
          caretColor: NEON,
          width: '100%',
          letterSpacing: '0.02em',
          opacity: disabled ? 0.45 : 1,
          // Flash: scale up slightly via filter brightness
          filter: flash ? 'brightness(1.6)' : 'brightness(1)',
          transform: flash ? 'scaleX(1.005)' : 'scaleX(1)',
          transition: flash ? 'none' : 'filter 0.12s ease-out, transform 0.12s ease-out'
        }}
        key={flashKey > 0 ? undefined : undefined}
      />
      {/* blinking cursor indicator overlay (shown when field active but value empty) */}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdbShellDialog({ deviceId, isOpen, onDismiss }: AdbShellDialogProps): React.ReactElement {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [historyIndex, setHistoryIndex] = useState(-1)

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Typing animation for output
  useTypingAnimation(history, setHistory)

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setHistory([])
      setCommand('')
      setHistoryIndex(-1)
    }
  }, [isOpen])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  const runCommand = async (cmdOverride?: string): Promise<void> => {
    const cmd = (cmdOverride ?? command).trim()
    if (!cmd || isRunning) return

    setIsRunning(true)
    if (cmdOverride === undefined) setCommand('')
    setHistoryIndex(-1)

    let output: string | null = null
    let isError = false

    try {
      const isLocalAdb = /^adb(\s|$)/i.test(cmd)
      if (isLocalAdb) {
        // Run locally with bundled adb — strip 'adb ' prefix (case-insensitive)
        const adbArgs = cmd.replace(/^adb\s*/i, '').trim()
        output = await window.api.adb.runLocalAdbCommand(adbArgs)
      } else {
        output = await window.api.adb.runShellCommand(deviceId, cmd)
      }
      if (!output) output = '(no output)'
    } catch (err) {
      output = err instanceof Error ? err.message : String(err)
      isError = true
    }

    setHistory((prev) => [
      ...prev,
      { command: cmd, output, error: isError }
    ])
    setIsRunning(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      runCommand()
      return
    }

    const cmds = history.map((h) => h.command)
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const nextIndex = historyIndex + 1
      if (nextIndex < cmds.length) {
        setHistoryIndex(nextIndex)
        setCommand(cmds[cmds.length - 1 - nextIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex <= 0) {
        setHistoryIndex(-1)
        setCommand('')
      } else {
        const nextIndex = historyIndex - 1
        setHistoryIndex(nextIndex)
        setCommand(cmds[cmds.length - 1 - nextIndex])
      }
    }
  }

  const promptLabel = `[${deviceId}@cyberdeck]$`

  return (
    <Dialog open={isOpen} onOpenChange={(_, { open }) => { if (!open) onDismiss() }}>
      <DialogSurface style={S.surface}>
        <DialogBody style={S.body}>

          {/* ── Title bar ── */}
          <DialogTitle style={{ padding: 0, margin: 0 }}>
            <div style={S.titleBar}>
              <span style={S.titleText}>[ADB SHELL — {deviceId}]</span>
              <span style={{
                fontFamily: "var(--vrcd-font-mono)",
                fontSize: '10px',
                letterSpacing: '0.15em',
                color: 'rgba(var(--vrcd-neon-raw),0.35)',
                userSelect: 'none'
              }}>
                SECURE TERMINAL
              </span>
            </div>
          </DialogTitle>

          {/* ── Content ── */}
          <DialogContent style={S.content}>

            <AdbShortcuts onRun={(cmd) => runCommand(cmd)} disabled={isRunning} />

            {/* Terminal area */}
            <div
              ref={containerRef}
              style={{ position: 'relative' }}
            >
              {/* Terminal output */}
              <div
                ref={terminalRef}
                style={S.terminal}
                onClick={() => inputRef.current?.focus()}
              >
                {history.length === 0 && (
                  <span style={S.emptyHint}>Type a shell command and press Enter.</span>
                )}

                {history.map((entry, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', gap: '0' }}>
                      <span style={S.prompt}>{promptLabel}</span>
                      <span style={S.commandText}>&nbsp;{entry.command}</span>
                    </div>
                    {entry.output !== null && (
                      <div style={entry.error ? S.errorText : S.outputText}>
                        {entry.typingDone ? entry.output : (entry.rendered ?? '')}
                        {!entry.typingDone && (
                          <span style={{ opacity: 0.7 }}>▌</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {isRunning && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={S.prompt}>{promptLabel}</span>
                    <span style={{ color: 'rgba(var(--vrcd-neon-raw),0.5)', fontFamily: "var(--vrcd-font-mono)" }}>
                      executing...
                    </span>
                  </div>
                )}
              </div>

              {/* Input row — also hidden during animation */}
              <div
                style={{
                  ...S.inputRow,
                  marginTop: '8px'
                }}
              >
                <span style={{
                  ...S.prompt,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  fontSize: '12px'
                }}>
                  {promptLabel}
                </span>
                <FlashInput
                  value={command}
                  onChange={setCommand}
                  onKeyDown={handleKeyDown}
                  disabled={isRunning}
                  inputRef={inputRef}
                />
                <NeonButton
                  onClick={runCommand}
                  disabled={!command.trim() || isRunning}
                >
                  Run
                </NeonButton>
              </div>
            </div>

          </DialogContent>

          {/* ── Actions ── */}
          <DialogActions style={{ padding: 0, margin: 0 }}>
            <div style={S.actions}>
              <NeonButton onClick={() => setHistory([])}>
                Clear
              </NeonButton>
              <NeonButton onClick={onDismiss}>
                Close
              </NeonButton>
            </div>
          </DialogActions>

        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
