import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Separator } from '@renderer/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'
import { cn } from '@renderer/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomShortcut {
  id: string
  label: string
  command: string
}

interface PresetShortcut {
  label: string
  command: string
  desc?: string
}

interface PresetCategory {
  name: string
  items: PresetShortcut[]
}

interface AdbShortcutsProps {
  onRun: (command: string) => void
  disabled?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'vrcyberdeck:adbCustomShortcuts'
const COLLAPSED_KEY = 'vrcyberdeck:adbShortcutsCollapsed'

const PRESETS: PresetCategory[] = [
  {
    name: 'Performance',
    items: [
      { label: 'CPU 4', command: 'setprop debug.oculus.cpuLevel 4', desc: 'Pin CPU to highest level (4)' },
      { label: 'GPU 4', command: 'setprop debug.oculus.gpuLevel 4', desc: 'Pin GPU to highest level (4)' },
      { label: 'CPU/GPU auto', command: 'setprop debug.oculus.cpuLevel 0 && setprop debug.oculus.gpuLevel 0', desc: 'Reset CPU/GPU governors to auto' },
      { label: '72 Hz', command: 'setprop debug.oculus.refreshRate 72' },
      { label: '90 Hz', command: 'setprop debug.oculus.refreshRate 90' },
      { label: '120 Hz', command: 'setprop debug.oculus.refreshRate 120' },
      { label: 'Tex 1.0', command: 'setprop debug.oculus.textureWidth 0 && setprop debug.oculus.textureHeight 0', desc: 'Reset render resolution to default' },
      { label: 'GFX stats', command: 'dumpsys SurfaceFlinger --latency-clear', desc: 'Reset SurfaceFlinger frame stats' }
    ]
  },
  {
    name: 'Updates',
    items: [
      { label: 'Block FW', command: 'pm disable-user --user 0 com.oculus.updater', desc: 'Disable the OS updater (rollback-friendly)' },
      { label: 'Unblock FW', command: 'pm enable com.oculus.updater', desc: 'Re-enable the OS updater' },
      { label: 'Block store', command: 'pm disable-user --user 0 com.oculus.store', desc: 'Disable Meta Store updates' },
      { label: 'Unblock store', command: 'pm enable com.oculus.store' }
    ]
  },
  {
    name: 'System',
    items: [
      { label: 'Reboot', command: 'reboot' },
      { label: 'Reboot bootloader', command: 'reboot bootloader' },
      { label: 'Reboot recovery', command: 'reboot recovery' },
      { label: 'Battery', command: 'dumpsys battery', desc: 'Show full battery status' },
      { label: 'Storage', command: 'df -h /sdcard' },
      { label: 'Wi-Fi info', command: 'dumpsys wifi | head -40' },
      { label: 'IP addr', command: "ip route | awk '{print $9}'", desc: 'Print device IP address' },
      { label: 'Proximity off', command: 'am broadcast -a com.oculus.vrpowermanager.prox_close', desc: 'Disable proximity sensor (sleep prevention)' },
      { label: 'Proximity on', command: 'am broadcast -a com.oculus.vrpowermanager.automation_disable' },
      { label: 'Revert UI', command: 'adb shell pm clear com.oculus.vrshell', desc: 'Clear VR shell data to revert UI to pre-Navigator state' }
    ]
  },
  {
    name: 'Packages',
    items: [
      { label: 'List 3rd-party', command: 'pm list packages -3' },
      { label: 'List all', command: 'pm list packages' },
      { label: 'Current app', command: "dumpsys window | grep -E 'mCurrentFocus|mFocusedApp'" }
    ]
  },
  {
    name: 'Wireless',
    items: [
      { label: 'TCP/IP 5555', command: 'adb tcpip 5555', desc: 'Switch local adbd to TCP mode on port 5555' },
      { label: 'Devices', command: 'adb devices -l' }
    ]
  }
]

// ─── Persistence ──────────────────────────────────────────────────────────────

function readCustom(): CustomShortcut[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        typeof s.label === 'string' &&
        typeof s.command === 'string'
    )
  } catch {
    return []
  }
}

function writeCustom(items: CustomShortcut[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

function writeCollapsed(v: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, String(v))
  } catch {
    /* ignore */
  }
}

// ─── Shortcut pill ──────────────────────────────────────────────────────────

const ShortcutPill: React.FC<{
  label: string
  desc?: string
  onClick: () => void
  disabled?: boolean
  onDelete?: () => void
}> = ({ label, desc, onClick, disabled, onDelete }) => {
  const btn = (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-7 px-2.5 text-xs font-normal',
        onDelete && 'pr-1'
      )}
    >
      <span className="truncate">{label}</span>
      {onDelete && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onDelete()
            }
          }}
          aria-label={`Remove ${label}`}
          className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </Button>
  )

  if (!desc) return btn
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{desc}</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">$ {desc ? '' : ''}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

const AdbShortcuts: React.FC<AdbShortcutsProps> = ({ onRun, disabled }) => {
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed)
  const [custom, setCustom] = useState<CustomShortcut[]>(readCustom)
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newCommand, setNewCommand] = useState('')

  const toggleCollapsed = useCallback((): void => {
    setCollapsed((prev) => {
      const next = !prev
      writeCollapsed(next)
      return next
    })
  }, [])

  useEffect(() => {
    writeCustom(custom)
  }, [custom])

  const addCustom = useCallback((): void => {
    const l = newLabel.trim()
    const c = newCommand.trim()
    if (!l || !c) return
    setCustom((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label: l, command: c }
    ])
    setNewLabel('')
    setNewCommand('')
    setAdding(false)
  }, [newLabel, newCommand])

  const removeCustom = useCallback((id: string): void => {
    setCustom((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const totalCount = useMemo(
    () => PRESETS.reduce((n, c) => n + c.items.length, 0) + custom.length,
    [custom.length]
  )

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-md border border-border bg-card">
        {/* Header */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent/50"
        >
          <div className="flex items-center gap-2">
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">Quick commands</span>
            <span className="text-xs text-muted-foreground">{totalCount}</span>
          </div>
        </button>

        {/* Body */}
        {!collapsed && (
          <div className="border-t border-border px-3 py-3 space-y-3">
            {PRESETS.map((cat) => (
              <div key={cat.name} className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {cat.name}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map((item) => (
                    <ShortcutPill
                      key={item.label}
                      label={item.label}
                      desc={item.desc}
                      onClick={() => onRun(item.command)}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            ))}

            <Separator />

            {/* Custom shortcuts */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Custom
                </Label>
                {!adding && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAdding(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>

              {custom.length === 0 && !adding && (
                <p className="text-xs text-muted-foreground">No custom shortcuts yet.</p>
              )}

              {custom.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {custom.map((s) => (
                    <ShortcutPill
                      key={s.id}
                      label={s.label}
                      desc={s.command}
                      onClick={() => onRun(s.command)}
                      disabled={disabled}
                      onDelete={() => removeCustom(s.id)}
                    />
                  ))}
                </div>
              )}

              {adding && (
                <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-2">
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Label (e.g. Show packages)"
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Input
                    value={newCommand}
                    onChange={(e) => setNewCommand(e.target.value)}
                    placeholder="Shell command"
                    className="h-8 font-mono text-sm"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAdding(false)
                        setNewLabel('')
                        setNewCommand('')
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={addCustom}
                      disabled={!newLabel.trim() || !newCommand.trim()}
                      className="h-7 px-2 text-xs"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {custom.length > 0 && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCustom([])}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Clear custom
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default AdbShortcuts
