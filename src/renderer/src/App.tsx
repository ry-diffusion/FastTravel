/**
 * Temporary stub. The actual application chrome and pages are being
 * rebuilt by the parallel redesign agents. Once they merge their work,
 * this file is replaced by the agent that owns AppLayout.
 */
function App(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Rebuilding interface…</p>
      </div>
    </div>
  )
}

export default App
