import React, { useEffect, useRef, useState } from 'react'
import { Eraser, Play, Terminal } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { cn } from '@renderer/lib/utils'
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

// ─── Typing animation ─────────────────────────────────────────────────────────

const INSTANT_THRESHOLD = 200

function useTypingAnimation(
  history: HistoryEntry[],
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>
): void {
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
    // Instant render for long output
    if (full.length > INSTANT_THRESHOLD) {
      setHistory((prev) =>
        prev.map((e, i) => (i === lastIdx ? { ...e, rendered: full, typingDone: true } : e))
      )
      return
    }

    // Char-by-char animation for short output
    let cancelled = false
    let i = 0
    const step = (): void => {
      if (cancelled) return
      i += Math.max(1, Math.floor(full.length / 30))
      if (i >= full.length) {
        setHistory((prev) =>
          prev.map((e, idx) =>
            idx === lastIdx ? { ...e, rendered: full, typingDone: true } : e
          )
        )
        return
      }
      setHistory((prev) =>
        prev.map((e, idx) => (idx === lastIdx ? { ...e, rendered: full.slice(0, i) } : e))
      )
      setTimeout(step, 12)
    }
    step()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length])
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AdbShellDialog({
  deviceId,
  isOpen,
  onDismiss
}: AdbShellDialogProps): React.ReactElement {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [historyIndex, setHistoryIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const terminalScrollRef = useRef<HTMLDivElement>(null)

  useTypingAnimation(history, setHistory)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setHistory([])
      setCommand('')
      setHistoryIndex(-1)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen])

  // Auto-scroll terminal
  useEffect(() => {
    const node = terminalScrollRef.current
    if (!node) return
    // ScrollArea wraps a viewport — find it
    const viewport = node.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null
    const target = viewport ?? node
    target.scrollTop = target.scrollHeight
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

    setHistory((prev) => [...prev, { command: cmd, output, error: isError }])
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

  const shortDeviceId = deviceId.length > 16 ? `${deviceId.slice(0, 8)}…${deviceId.slice(-4)}` : deviceId
  const promptLabel = `${shortDeviceId} $`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onDismiss() }}>
      <DialogContent className="max-w-4xl gap-0 p-0 sm:rounded-lg">
        {/* Header */}
        <DialogHeader className="border-b border-border px-5 py-3 space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            ADB shell
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {deviceId}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="space-y-3 px-5 py-4">
          <AdbShortcuts onRun={(cmd) => runCommand(cmd)} disabled={isRunning} />

          {/* Terminal output */}
          <div
            ref={terminalScrollRef}
            onClick={() => inputRef.current?.focus()}
            className="cursor-text overflow-hidden rounded-md border border-border bg-zinc-950"
          >
            <ScrollArea className="h-[320px]">
              <div className="space-y-1.5 px-4 py-3 font-mono text-[13px] leading-relaxed">
                {history.length === 0 && (
                  <p className="text-muted-foreground italic">
                    Type a shell command and press Enter — or pick a quick command above.
                  </p>
                )}

                {history.map((entry, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex gap-2">
                      <span className="select-none text-emerald-400">{promptLabel}</span>
                      <span className="text-foreground/90 break-all">{entry.command}</span>
                    </div>
                    {entry.output !== null && (
                      <div
                        className={cn(
                          'whitespace-pre-wrap break-all pl-0',
                          entry.error ? 'text-rose-400' : 'text-foreground/80'
                        )}
                      >
                        {entry.typingDone ? entry.output : (entry.rendered ?? '')}
                        {!entry.typingDone && (
                          <span className="opacity-70">▌</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {isRunning && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="select-none text-emerald-400/70">{promptLabel}</span>
                    <span className="italic">executing…</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Input row */}
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 focus-within:ring-1 focus-within:ring-ring">
            <span className="select-none font-mono text-xs text-emerald-400 shrink-0">
              {promptLabel}
            </span>
            <Input
              ref={inputRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRunning}
              placeholder="Enter shell command…"
              spellCheck={false}
              autoComplete="off"
              className="h-7 border-0 bg-transparent p-0 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              size="sm"
              onClick={() => runCommand()}
              disabled={!command.trim() || isRunning}
              className="h-7 px-3 text-xs"
            >
              <Play className="mr-1 h-3 w-3" />
              Run
            </Button>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistory([])}
            disabled={history.length === 0}
          >
            <Eraser className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
