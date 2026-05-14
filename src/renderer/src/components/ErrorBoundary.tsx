import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error)
    return { hasError: true, message }
  }

  handleReset = (): void => {
    // Wipe known preference keys so stale data can't re-trigger the crash
    try {
      const keys = [
        'avr-table-prefs-v1',
        'avr-table-prefs-v2',
        'avr-table-prefs-v5',
        'vrcyberdeck:categoryFilter',
        'vrcyberdeck:hideAdult',
        'vrcyberdeck:transfersTab',
        'vrcyberdeck:adbCustomShortcuts',
        'vrcyberdeck:adbShortcutsCollapsed'
      ]
      keys.forEach((k) => localStorage.removeItem(k))
    } catch { /* ignore */ }
    window.location.reload()
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background px-6">
        <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/30">
            <AlertCircle className="h-7 w-7 text-destructive" aria-hidden />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error stopped the app. Resetting your preferences usually fixes it.
            </p>
          </div>

          <pre className="w-full overflow-auto rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-left font-mono text-xs text-destructive">
            {this.state.message || 'An unexpected error occurred.'}
          </pre>

          <Button onClick={this.handleReset} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Reset and reload
          </Button>
        </div>
      </div>
    )
  }
}
