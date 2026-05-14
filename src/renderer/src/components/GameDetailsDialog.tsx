import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import {
  Download,
  Trash2,
  RefreshCw,
  ArrowUp,
  CheckCircle,
  Info,
  Play,
  ChevronDown,
  Loader2,
  X
} from 'lucide-react'
import { GameInfo } from '@shared/types'
import { useGames } from '@renderer/hooks/useGames'
import { useAdb } from '@renderer/hooks/useAdb'
import { getSideloadingDisabled } from '@renderer/hooks/useExtrasSettings'
import NoteRenderer from './NoteRenderer'
import placeholderImage from '../assets/images/game-placeholder.png'

// ─── ErrorDetailDialog lives here for self-containment ──────────────────────
// (ErrorDetailDialog.tsx is still used by other surfaces; we import inline logic)

interface GameDetailsDialogProps {
  game: GameInfo | null
  open: boolean
  onClose: () => void
  downloadStatusMap: Map<
    string,
    { status: string; progress: number; error?: string; downloadPath?: string; speed?: string; eta?: string }
  >
  onInstall: (game: GameInfo) => void
  onUninstall: (game: GameInfo) => Promise<void>
  onReinstall: (game: GameInfo) => Promise<void>
  onUpdate: (game: GameInfo) => Promise<void>
  onRetry: (game: GameInfo) => void
  onCancelDownload: (game: GameInfo) => void
  onDeleteDownloaded: (game: GameInfo) => void
  onInstallFromCompleted: (game: GameInfo) => void
  getNote: (releaseName: string) => Promise<string | null>
  isConnected: boolean
  isBusy: boolean
}

// ─── Status helpers ──────────────────────────────────────────────────────────
function getStatusLabel(game: GameInfo, dlStatus: string | undefined): string {
  if (game.isInstalled) return game.hasUpdate ? 'Update available' : 'Installed'
  if (!dlStatus) return 'Not installed'
  const map: Record<string, string> = {
    Completed: 'Downloaded',
    InstallError: 'Install error',
    Error: 'Download error',
    Installing: 'Installing…',
    Downloading: 'Downloading…',
    Extracting: 'Extracting…',
    Queued: 'Queued',
    Cancelled: 'Cancelled',
    Paused: 'Paused'
  }
  return map[dlStatus] ?? dlStatus
}

function StatusBadge({ game, dlStatus }: { game: GameInfo; dlStatus: string | undefined }) {
  if (game.isInstalled && !game.hasUpdate)
    return (
      <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 border">
        Installed
      </Badge>
    )
  if (game.hasUpdate)
    return (
      <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 border">
        Update available
      </Badge>
    )
  if (dlStatus === 'Error' || dlStatus === 'InstallError')
    return <Badge variant="destructive">{getStatusLabel(game, dlStatus)}</Badge>
  if (dlStatus === 'Completed')
    return <Badge variant="secondary">Downloaded</Badge>
  if (dlStatus === 'Installing' || dlStatus === 'Downloading' || dlStatus === 'Extracting')
    return <Badge className="bg-primary/15 text-primary border-primary/30 border">{getStatusLabel(game, dlStatus)}</Badge>
  if (dlStatus === 'Queued')
    return <Badge variant="outline">Queued</Badge>
  return <Badge variant="outline">Not installed</Badge>
}

// ─── Action buttons ──────────────────────────────────────────────────────────
interface ActionButtonsProps {
  game: GameInfo
  dlStatus: string | undefined
  isConnected: boolean
  isBusy: boolean
  onInstall: (game: GameInfo) => void
  onUninstall: (game: GameInfo) => Promise<void>
  onReinstall: (game: GameInfo) => Promise<void>
  onUpdate: (game: GameInfo) => Promise<void>
  onRetry: (game: GameInfo) => void
  onCancelDownload: (game: GameInfo) => void
  onDeleteDownloaded: (game: GameInfo) => void
  onInstallFromCompleted: (game: GameInfo) => void
  onShowError: () => void
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  game,
  dlStatus,
  isConnected,
  isBusy,
  onInstall,
  onUninstall,
  onReinstall,
  onUpdate,
  onRetry,
  onCancelDownload,
  onDeleteDownloaded,
  onInstallFromCompleted,
  onShowError
}) => {
  const noSideload = getSideloadingDisabled()

  const canCancel = dlStatus === 'Downloading' || dlStatus === 'Extracting' || dlStatus === 'Queued'
  const isDownloaded = dlStatus === 'Completed'
  const isInstallError = dlStatus === 'InstallError'
  const isErrorOrCancelled = dlStatus === 'Error' || dlStatus === 'Cancelled'
  const isInstalling = dlStatus === 'Installing'

  if (isInstalling)
    return (
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Installing…
      </span>
    )

  if (canCancel)
    return (
      <Button
        variant="destructive"
        size="sm"
        onClick={() => onCancelDownload(game)}
        disabled={isBusy}
      >
        <X className="h-3.5 w-3.5 mr-1.5" />
        Cancel download
      </Button>
    )

  if (isInstallError || isErrorOrCancelled)
    return (
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => onRetry(game)} disabled={isBusy}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
        {(isInstallError || dlStatus === 'Error') && (
          <Button variant="outline" size="sm" onClick={onShowError}>
            <Info className="h-3.5 w-3.5 mr-1.5" />
            Error details
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDeleteDownloaded(game)}
          disabled={isBusy}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete files
        </Button>
      </div>
    )

  if (game.isInstalled) {
    if (game.hasUpdate)
      return (
        <div className="flex gap-2 flex-wrap">
          {!noSideload && (
            <Button size="sm" onClick={() => onUpdate(game)} disabled={!isConnected || isBusy}>
              <ArrowUp className="h-3.5 w-3.5 mr-1.5" />
              Update
            </Button>
          )}
          {!noSideload && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onUninstall(game)}
              disabled={!isConnected || isBusy}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Uninstall
            </Button>
          )}
          {noSideload && (
            <span className="text-xs text-muted-foreground">Sideloading disabled</span>
          )}
        </div>
      )

    return (
      <div className="flex gap-2 flex-wrap">
        {!noSideload && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onReinstall(game)}
            disabled={!isConnected || isBusy}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reinstall
          </Button>
        )}
        {!noSideload && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onUninstall(game)}
            disabled={!isConnected || isBusy}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Uninstall
          </Button>
        )}
        {noSideload && (
          <span className="text-xs text-muted-foreground">Sideloading disabled</span>
        )}
      </div>
    )
  }

  if (isDownloaded)
    return (
      <div className="flex gap-2 flex-wrap">
        {!noSideload && (
          <Button
            size="sm"
            onClick={() => onInstallFromCompleted(game)}
            disabled={!isConnected || isBusy}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Install
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDeleteDownloaded(game)}
          disabled={isBusy}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete files
        </Button>
      </div>
    )

  return (
    <Button size="sm" onClick={() => onInstall(game)} disabled={isBusy}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      Download
    </Button>
  )
}

// ─── Main dialog ─────────────────────────────────────────────────────────────
const GameDetailsDialog: React.FC<GameDetailsDialogProps> = ({
  game,
  open,
  onClose,
  downloadStatusMap,
  onInstall,
  onUninstall,
  onReinstall,
  onUpdate,
  onRetry,
  onCancelDownload,
  onDeleteDownloaded,
  onInstallFromCompleted,
  getNote,
  isConnected,
  isBusy
}) => {
  const { getTrailerUrl } = useGames()
  const { selectedDevice } = useAdb()
  const [currentGameNote, setCurrentGameNote] = useState<string | null>(null)
  const [loadingNote, setLoadingNote] = useState(false)
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null)
  const [loadingVideo, setLoadingVideo] = useState(false)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [errorDetailOpen, setErrorDetailOpen] = useState(false)
  const webviewRef = useRef<HTMLElement>(null)

  // ── Trailer CSS injection ───────────────────────────────────────────────
  const handleWebviewReady = useCallback(() => {
    const wv = webviewRef.current as
      | (HTMLElement & {
          insertCSS: (css: string) => Promise<string>
          executeJavaScript: (code: string) => Promise<unknown>
        })
      | null
    if (!wv) return
    void wv.insertCSS(`
      #masthead-container, #top-row, #bottom-row,
      ytd-watch-metadata, #related, #comments,
      #secondary, #below, ytd-masthead,
      #guide-button, ytd-mini-guide-renderer,
      #chat-container, .ytp-chrome-top,
      #info-contents, #meta-contents,
      ytd-merch-shelf-renderer, #offer-module,
      tp-yt-app-drawer, #guide-wrapper,
      .ytd-watch-flexy #menu, #subscribe-button,
      .ytd-watch-flexy #actions, #notification-preference-button,
      ytd-watch-next-secondary-results-renderer,
      #description, #header, #content-header,
      ytd-engagement-panel-section-list-renderer,
      #panels, ytd-watch-flexy #cinematics,
      ytd-compact-video-renderer, .ytp-endscreen-content,
      .ytp-ce-element, .ytp-pause-overlay,
      ytd-clarification-renderer, ytd-info-panel-content-renderer {
        display: none !important;
      }
      body { overflow: hidden !important; background: #000 !important; }
      #page-manager, ytd-watch-flexy, #player-container-outer,
      #player-container-inner, #player, #ytd-player,
      .html5-video-player, video {
        position: fixed !important;
        top: 0 !important; left: 0 !important;
        width: 100vw !important; height: 100vh !important;
        max-width: 100vw !important; max-height: 100vh !important;
        margin: 0 !important; padding: 0 !important;
      }
      ytd-watch-flexy[theater], ytd-watch-flexy[fullscreen] {
        max-height: 100vh !important;
      }
      .html5-video-container { width: 100% !important; height: 100% !important; }
    `)
    void wv.executeJavaScript(`
      const v = document.querySelector('video');
      if (v && v.paused) v.play();
    `)
  }, [])

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv || !trailerUrl) return
    wv.addEventListener('dom-ready', handleWebviewReady)
    return () => wv.removeEventListener('dom-ready', handleWebviewReady)
  }, [trailerUrl, trailerOpen, handleWebviewReady])

  // ── Load note ──────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    if (open && game?.releaseName) {
      setLoadingNote(true)
      setCurrentGameNote(null)
      getNote(game.releaseName)
        .then((n) => { if (alive) setCurrentGameNote(n) })
        .catch(() => { if (alive) setCurrentGameNote('Error loading note.') })
        .finally(() => { if (alive) setLoadingNote(false) })
    }
    return () => { alive = false }
  }, [open, game, getNote])

  // ── Load trailer ───────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    if (open && game?.name) {
      setLoadingVideo(true)
      setTrailerUrl(null)
      setTrailerOpen(false)
      getTrailerUrl(game.name, game.packageName)
        .then((url) => { if (alive && url) setTrailerUrl(url) })
        .catch(() => { /* no trailer */ })
        .finally(() => { if (alive) setLoadingVideo(false) })
    }
    return () => { alive = false }
  }, [open, game, getTrailerUrl])

  if (!game) return null

  const statusEntry = game.releaseName ? downloadStatusMap.get(game.releaseName) : undefined
  const dlStatus = statusEntry?.status
  const dlProgress = statusEntry?.progress ?? 0
  const showProgress =
    dlStatus === 'Downloading' || dlStatus === 'Extracting' || dlStatus === 'Installing'

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold truncate pr-6">
              {game.name}
            </DialogTitle>
          </DialogHeader>

          {/* Cover + meta row */}
          <div className="flex gap-5 mt-2">
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-48 aspect-square rounded-lg overflow-hidden border border-border bg-muted">
              <img
                src={game.thumbnailPath ? `file://${game.thumbnailPath}` : placeholderImage}
                alt={game.name}
                className="w-full h-full object-cover block"
              />
            </div>

            {/* Meta column */}
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              {/* Package name */}
              <p className="text-xs text-muted-foreground font-mono truncate">
                {game.packageName}
              </p>

              {/* Status badge */}
              <div className="flex items-center gap-2 flex-wrap">
                {(dlStatus === 'InstallError' || dlStatus === 'Error') ? (
                  <button
                    type="button"
                    onClick={() => setErrorDetailOpen(true)}
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    title="Click for error details"
                  >
                    <StatusBadge game={game} dlStatus={dlStatus} />
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </button>
                ) : (
                  <StatusBadge game={game} dlStatus={dlStatus} />
                )}
              </div>

              {/* Info row */}
              <div className="flex items-center gap-3 flex-wrap">
                {game.size && game.size !== '0 MB' && (
                  <span className="text-xs text-muted-foreground">{game.size}</span>
                )}
                {game.downloads != null && (
                  <span className="text-xs text-muted-foreground">
                    {game.downloads.toLocaleString()} downloads
                  </span>
                )}
                {game.version && (
                  <span className="text-xs text-muted-foreground">
                    v{game.version}
                    {game.isInstalled && game.deviceVersionCode && (
                      <span className="text-muted-foreground/60">
                        {' '}(installed: v{game.deviceVersionCode})
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Release name + date */}
              <div className="flex flex-col gap-0.5">
                {game.releaseName && (
                  <p className="text-xs text-muted-foreground truncate">{game.releaseName}</p>
                )}
                {game.lastUpdated && (
                  <p className="text-xs text-muted-foreground">{String(game.lastUpdated)}</p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-auto pt-1">
                <ActionButtons
                  game={game}
                  dlStatus={dlStatus}
                  isConnected={isConnected}
                  isBusy={isBusy}
                  onInstall={onInstall}
                  onUninstall={onUninstall}
                  onReinstall={onReinstall}
                  onUpdate={onUpdate}
                  onRetry={onRetry}
                  onCancelDownload={onCancelDownload}
                  onDeleteDownloaded={onDeleteDownloaded}
                  onInstallFromCompleted={onInstallFromCompleted}
                  onShowError={() => setErrorDetailOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* Download progress */}
          {showProgress && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">
                  {dlStatus}… {dlProgress}%
                  {statusEntry?.speed ? ` · ${statusEntry.speed}` : ''}
                  {statusEntry?.eta ? ` · ${statusEntry.eta} remaining` : ''}
                </span>
              </div>
              <Progress value={dlProgress} max={100} className="h-1" aria-label="Download progress" />
            </div>
          )}

          <Separator className="mt-4" />

          {/* Trailer section */}
          <div className="mt-3">
            <button
              onClick={() => setTrailerOpen(!trailerOpen)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${trailerOpen ? 'rotate-180' : ''}`}
              />
              <Play className="h-3.5 w-3.5" />
              <span className="font-medium">Trailer</span>
              {loadingVideo && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
              {!trailerUrl && !loadingVideo && (
                <span className="ml-auto text-muted-foreground/60">Not available</span>
              )}
            </button>

            {trailerOpen && trailerUrl && (
              <div
                className="relative mt-3 rounded-lg overflow-hidden bg-black border border-border"
                style={{ paddingTop: '56.25%' }}
              >
                {/youtube(?:-nocookie)?\.com|youtu\.be/.test(trailerUrl) ? (
                  <webview
                    ref={webviewRef}
                    key={trailerUrl}
                    src={trailerUrl}
                    // eslint-disable-next-line react/no-unknown-property
                    partition="persist:youtube"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                  />
                ) : (
                  <video
                    key={trailerUrl}
                    src={trailerUrl}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                )}
              </div>
            )}
            {trailerOpen && !trailerUrl && !loadingVideo && (
              <p className="text-xs text-muted-foreground mt-2">No trailer available.</p>
            )}
          </div>

          <Separator className="mt-4" />

          {/* Notes section */}
          <div className="mt-3 mb-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Notes</p>
            {loadingNote ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </div>
            ) : currentGameNote ? (
              <NoteRenderer
                note={currentGameNote}
                selectedDevice={selectedDevice}
                downloadPath={statusEntry?.downloadPath ?? null}
              />
            ) : (
              <p className="text-xs text-muted-foreground">No notes available.</p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error detail inline dialog */}
      {errorDetailOpen && (
        <Dialog open={errorDetailOpen} onOpenChange={(open) => { if (!open) setErrorDetailOpen(false) }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Download error</DialogTitle>
            </DialogHeader>
            <div className="mt-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                {dlStatus === 'InstallError'
                  ? 'The file downloaded successfully but failed during installation.'
                  : 'The download failed before completing.'}
              </p>
              {statusEntry?.error && (
                <pre className="bg-muted rounded-md p-3 text-xs font-mono whitespace-pre-wrap break-all">
                  {statusEntry.error}
                </pre>
              )}
              <p className="text-xs text-muted-foreground">
                Game: {game.name}
                {game.releaseName ? ` (${game.releaseName})` : ''}
              </p>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setErrorDetailOpen(false)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onRetry(game)
                  setErrorDetailOpen(false)
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default GameDetailsDialog
