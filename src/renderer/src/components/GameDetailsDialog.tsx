import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GameInfo } from '@shared/types'
import { Button, Chip, Progress, Spinner } from '@heroui/react'
import placeholderImage from '../assets/images/game-placeholder.png'
import { useGames } from '@renderer/hooks/useGames'
import { useAdb } from '@renderer/hooks/useAdb'
import { getSideloadingDisabled } from '@renderer/hooks/useExtrasSettings'
import ErrorDetailDialog, { ErrorPhase } from './ErrorDetailDialog'
import NoteRenderer from './NoteRenderer'

// ─── Inline icons ─────────────────────────────────────────────────────────────
const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const DownloadIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)
const TrashIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)
const RefreshIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)
const ArrowUpIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
  </svg>
)
const UninstallIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
)
const CheckCircleIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
const InfoIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)
const PlayIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)
const ChevronDownIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

interface GameDetailsDialogProps {
  game: GameInfo | null
  open: boolean
  onClose: () => void
  downloadStatusMap: Map<string, { status: string; progress: number; error?: string; downloadPath?: string }>
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

const GameDetailsDialog: React.FC<GameDetailsDialogProps> = ({
  game, open, onClose, downloadStatusMap,
  onInstall, onUninstall, onReinstall, onUpdate,
  onRetry, onCancelDownload, onDeleteDownloaded,
  onInstallFromCompleted, getNote, isConnected, isBusy
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

  // Trailer CSS injection — same approach as before
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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const renderActionButtons = (g: GameInfo): React.ReactNode => {
    const status = downloadStatusMap.get(g.releaseName || '')?.status
    const canCancel = status === 'Downloading' || status === 'Extracting' || status === 'Queued'
    const isDownloaded = status === 'Completed'
    const isInstallError = status === 'InstallError'
    const isErrorOrCancelled = status === 'Error' || status === 'Cancelled'
    const isInstalling = status === 'Installing'
    const noSideload = getSideloadingDisabled()

    if (isInstalling) return (
      <div className="flex items-center gap-2 text-sm text-default-500">
        <Spinner size="sm" color="primary" />
        <span>Installing...</span>
      </div>
    )

    if (canCancel) return (
      <Button
        color="danger"
        variant="flat"
        size="sm"
        startContent={<XIcon size={13} />}
        onPress={() => onCancelDownload(g)}
        isDisabled={isBusy}
      >
        Cancel download
      </Button>
    )

    if (isInstallError || isErrorOrCancelled) return (
      <div className="flex gap-2 flex-wrap">
        <Button
          color="primary"
          size="sm"
          startContent={<RefreshIcon size={13} />}
          onPress={() => onRetry(g)}
          isDisabled={isBusy}
        >
          Retry
        </Button>
        {(isInstallError || status === 'Error') && (
          <Button
            color="danger"
            variant="flat"
            size="sm"
            startContent={<InfoIcon size={13} />}
            onPress={() => setErrorDetailOpen(true)}
          >
            Error details
          </Button>
        )}
        <Button
          color="danger"
          variant="flat"
          size="sm"
          startContent={<TrashIcon size={13} />}
          onPress={() => onDeleteDownloaded(g)}
          isDisabled={isBusy}
        >
          Delete files
        </Button>
      </div>
    )

    if (g.isInstalled) {
      if (g.hasUpdate) return (
        <div className="flex gap-2 flex-wrap">
          {!noSideload && (
            <Button
              color="primary"
              size="sm"
              startContent={<ArrowUpIcon size={13} />}
              onPress={() => onUpdate(g)}
              isDisabled={!isConnected || isBusy}
            >
              Update
            </Button>
          )}
          {!noSideload && (
            <Button
              color="danger"
              variant="flat"
              size="sm"
              startContent={<UninstallIcon size={13} />}
              onPress={() => onUninstall(g)}
              isDisabled={!isConnected || isBusy}
            >
              Uninstall
            </Button>
          )}
          {noSideload && (
            <span className="text-xs text-default-400">Sideloading disabled</span>
          )}
        </div>
      )
      return (
        <div className="flex gap-2 flex-wrap">
          {!noSideload && (
            <Button
              color="default"
              variant="flat"
              size="sm"
              startContent={<RefreshIcon size={13} />}
              onPress={() => onReinstall(g)}
              isDisabled={!isConnected || isBusy}
            >
              Reinstall
            </Button>
          )}
          {!noSideload && (
            <Button
              color="danger"
              variant="flat"
              size="sm"
              startContent={<UninstallIcon size={13} />}
              onPress={() => onUninstall(g)}
              isDisabled={!isConnected || isBusy}
            >
              Uninstall
            </Button>
          )}
          {noSideload && (
            <span className="text-xs text-default-400">Sideloading disabled</span>
          )}
        </div>
      )
    }

    if (isDownloaded) return (
      <div className="flex gap-2 flex-wrap">
        {!noSideload && (
          <Button
            color="primary"
            size="sm"
            startContent={<CheckCircleIcon size={13} />}
            onPress={() => onInstallFromCompleted(g)}
            isDisabled={!isConnected || isBusy}
          >
            Install
          </Button>
        )}
        <Button
          color="danger"
          variant="flat"
          size="sm"
          startContent={<TrashIcon size={13} />}
          onPress={() => onDeleteDownloaded(g)}
          isDisabled={isBusy}
        >
          Delete files
        </Button>
      </div>
    )

    return (
      <Button
        color="primary"
        size="sm"
        startContent={<DownloadIcon size={13} />}
        onPress={() => onInstall(g)}
        isDisabled={isBusy}
      >
        Download
      </Button>
    )
  }

  if (!game || !open) return null

  const statusEntry = game.releaseName ? downloadStatusMap.get(game.releaseName) : undefined
  const dlStatus = statusEntry?.status
  const dlProgress = statusEntry?.progress ?? 0
  const showProgress = dlStatus === 'Downloading' || dlStatus === 'Extracting' || dlStatus === 'Installing'

  // Status chip color + label
  const statusColor: 'success' | 'warning' | 'danger' | 'default' | 'primary' =
    game.isInstalled
      ? (game.hasUpdate ? 'warning' : 'success')
      : dlStatus === 'Completed' ? 'default'
      : dlStatus === 'InstallError' || dlStatus === 'Error' ? 'danger'
      : dlStatus === 'Installing' ? 'primary'
      : 'default'

  const statusLabel =
    game.isInstalled ? (game.hasUpdate ? 'Update available' : 'Installed')
    : dlStatus === 'Completed' ? 'Downloaded'
    : dlStatus === 'InstallError' ? 'Install error'
    : dlStatus === 'Error' ? 'Download error'
    : dlStatus === 'Installing' ? 'Installing...'
    : 'Not installed'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-content1 border border-divider rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '90vw', maxWidth: 680, maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-divider flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground truncate pr-4">{game.name}</h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-default-400 hover:text-default-700 transition-colors rounded-lg p-1 hover:bg-default-100"
            aria-label="Close"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

          {/* Cover + meta row */}
          <div className="flex gap-4">
            {/* Cover image */}
            <div className="flex-shrink-0 w-32 h-32 rounded-xl overflow-hidden border border-divider bg-content2">
              <img
                src={game.thumbnailPath ? `file://${game.thumbnailPath}` : placeholderImage}
                alt={game.name}
                className="w-full h-full object-cover block"
              />
            </div>

            {/* Meta */}
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <p className="text-xs text-default-400 font-mono truncate">{game.packageName}</p>

              {/* Status + badges row */}
              <div className="flex items-center gap-2 flex-wrap">
                {(dlStatus === 'InstallError' || dlStatus === 'Error') ? (
                  <button
                    type="button"
                    onClick={() => setErrorDetailOpen(true)}
                    title="Click for error details"
                    className="flex items-center gap-1"
                  >
                    <Chip size="sm" color={statusColor} variant="flat" className="text-xs cursor-pointer hover:opacity-80">
                      {statusLabel} <InfoIcon size={11} />
                    </Chip>
                  </button>
                ) : (
                  <Chip size="sm" color={statusColor} variant="flat" className="text-xs">{statusLabel}</Chip>
                )}
              </div>

              {/* Info row */}
              <div className="flex items-center gap-3 flex-wrap">
                {game.size && game.size !== '0 MB' && (
                  <span className="text-xs text-default-400">{game.size}</span>
                )}
                {game.downloads != null && (
                  <span className="text-xs text-default-400">{game.downloads.toLocaleString()} downloads</span>
                )}
                {game.version && (
                  <span className="text-xs text-default-400">
                    v{game.version}
                    {game.isInstalled && game.deviceVersionCode && (
                      <span className="text-default-300"> (installed: v{game.deviceVersionCode})</span>
                    )}
                  </span>
                )}
              </div>

              {/* Release + date */}
              <div className="flex flex-col gap-0.5">
                {game.releaseName && (
                  <p className="text-xs text-default-400 truncate">{game.releaseName}</p>
                )}
                {game.lastUpdated && (
                  <p className="text-xs text-default-400">{String(game.lastUpdated)}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-1">
                {renderActionButtons(game)}
              </div>
            </div>
          </div>

          {/* Download progress */}
          {showProgress && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Spinner size="sm" color="primary" />
                <span className="text-xs text-default-500">
                  {dlStatus}... {dlProgress}%
                </span>
              </div>
              <Progress value={dlProgress} maxValue={100} color="primary" size="sm" className="w-full" aria-label="Download progress" />
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-divider" />

          {/* Trailer section */}
          <div>
            <button
              onClick={() => setTrailerOpen(!trailerOpen)}
              className="flex items-center gap-2 text-xs text-default-500 hover:text-foreground transition-colors w-full text-left"
            >
              <span className={`transition-transform ${trailerOpen ? 'rotate-180' : ''}`}>
                <ChevronDownIcon size={13} />
              </span>
              <PlayIcon size={13} />
              <span className="font-medium">Trailer</span>
              {loadingVideo && <Spinner size="sm" color="default" className="ml-1" />}
              {!trailerUrl && !loadingVideo && (
                <span className="ml-auto text-default-300">Not available</span>
              )}
            </button>

            {trailerOpen && trailerUrl && (
              <div
                className="relative mt-3 rounded-xl overflow-hidden bg-black border border-divider"
                style={{ paddingTop: '56.25%' }}
              >
                {/youtube(?:-nocookie)?\.com|youtu\.be/.test(trailerUrl) ? (
                  <webview
                    ref={webviewRef}
                    key={trailerUrl}
                    src={trailerUrl}
                    // eslint-disable-next-line react/no-unknown-property
                    partition="persist:youtube"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <video
                    key={trailerUrl}
                    src={trailerUrl}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}
              </div>
            )}
            {trailerOpen && !trailerUrl && !loadingVideo && (
              <p className="text-xs text-default-400 mt-2">No trailer available.</p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-divider" />

          {/* Notes section */}
          <div>
            <p className="text-xs font-medium text-default-500 uppercase tracking-wide mb-2">Notes</p>
            {loadingNote ? (
              <div className="flex items-center gap-2 text-xs text-default-400">
                <Spinner size="sm" color="default" />
                <span>Loading...</span>
              </div>
            ) : currentGameNote ? (
              <NoteRenderer
                note={currentGameNote}
                selectedDevice={selectedDevice}
                downloadPath={statusEntry?.downloadPath ?? null}
              />
            ) : (
              <p className="text-xs text-default-400">No notes available.</p>
            )}
          </div>
        </div>
      </div>

      <ErrorDetailDialog
        open={errorDetailOpen}
        onClose={() => setErrorDetailOpen(false)}
        error={statusEntry?.error}
        phase={(dlStatus === 'InstallError' ? 'install' : 'download') as ErrorPhase}
        contextLabel={`${game.name}${game.releaseName ? ` (${game.releaseName})` : ''}`}
        onRetry={() => onRetry(game)}
      />
    </div>
  )
}

export default GameDetailsDialog
