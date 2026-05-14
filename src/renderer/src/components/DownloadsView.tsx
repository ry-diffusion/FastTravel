import React, { useState } from 'react'
import {
  Folder,
  X,
  Pause,
  Play,
  ArrowUp,
  RotateCcw,
  Info,
  Trash2,
  ArrowDownToLine,
  XCircle,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useDownload } from '@renderer/hooks/useDownload'
import { useAdb } from '@renderer/hooks/useAdb'
import { useGames } from '@renderer/hooks/useGames'
import { useGameDialog } from '@renderer/hooks/useGameDialog'
import { getDeleteOnRemove, getSideloadingDisabled } from '@renderer/hooks/useExtrasSettings'
import { DownloadItem } from '@shared/types'
import ErrorDetailDialog, { ErrorPhase } from './ErrorDetailDialog'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { Progress } from '@renderer/components/ui/progress'
import placeholderImage from '../assets/images/game-placeholder.png'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAddedTime(timestamp: number): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

function statusLabel(item: DownloadItem): string {
  switch (item.status) {
    case 'Queued':
      return 'Queued'
    case 'Downloading':
      return item.speed ? `Downloading · ${item.speed}` : 'Downloading'
    case 'Extracting':
      return 'Extracting'
    case 'Installing':
      return (item.progress || 0) < 50 ? 'Installing APK' : 'Copying OBB'
    case 'Paused':
      return 'Paused'
    case 'Completed':
      return 'Completed'
    case 'Cancelled':
      return 'Cancelled'
    case 'Error':
      return 'Error'
    case 'InstallError':
      return 'Install error'
    default:
      return item.status
  }
}

function statusBadge(item: DownloadItem): React.ReactNode {
  const label = statusLabel(item)
  switch (item.status) {
    case 'Queued':
    case 'Paused':
      return <Badge variant="secondary" className="text-xs h-5 px-1.5">{label}</Badge>
    case 'Downloading':
    case 'Extracting':
    case 'Installing':
      return <Badge className="text-xs h-5 px-1.5">{label}</Badge>
    case 'Completed':
      return (
        <Badge className="text-xs h-5 px-1.5 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/15">
          {label}
        </Badge>
      )
    case 'Cancelled':
      return <Badge variant="outline" className="text-xs h-5 px-1.5">{label}</Badge>
    case 'Error':
    case 'InstallError':
      return <Badge variant="destructive" className="text-xs h-5 px-1.5">{label}</Badge>
    default:
      return <Badge variant="secondary" className="text-xs h-5 px-1.5">{label}</Badge>
  }
}

function progressValue(item: DownloadItem): number | null {
  switch (item.status) {
    case 'Downloading':
    case 'Paused':
      return item.progress ?? null
    case 'Extracting':
      return item.extractProgress ?? null
    case 'Installing':
      return item.progress ?? 0
    default:
      return null
  }
}

function showProgressBar(item: DownloadItem): boolean {
  return (
    item.status === 'Downloading' ||
    item.status === 'Extracting' ||
    item.status === 'Paused' ||
    item.status === 'Installing'
  )
}

// ---------------------------------------------------------------------------
// Inline delete confirmation
// ---------------------------------------------------------------------------

interface DeleteConfirmProps {
  onKeep: () => void
  onDelete: () => void
  onCancel: () => void
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ onKeep, onDelete, onCancel }) => (
  <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs">
    <span className="text-amber-500 font-medium whitespace-nowrap">Delete files too?</span>
    <Button
      size="sm"
      variant="ghost"
      className="h-6 px-2 text-xs"
      onClick={onKeep}
    >
      Keep files
    </Button>
    <Button
      size="sm"
      variant="destructive"
      className="h-6 px-2 text-xs"
      onClick={onDelete}
    >
      Delete
    </Button>
    <Button
      size="sm"
      variant="ghost"
      className="h-6 w-6 p-0"
      aria-label="Cancel"
      onClick={onCancel}
    >
      <X className="h-3 w-3" />
    </Button>
  </div>
)

// ---------------------------------------------------------------------------
// Download row
// ---------------------------------------------------------------------------

interface DownloadRowProps {
  item: DownloadItem
  isInstalled: boolean
  isConnected: boolean
  sideloadingDisabled: boolean
  confirmPending: string | null
  onInstall: (releaseName: string) => void
  onUninstall: (item: DownloadItem) => void
  onPause: (releaseName: string) => void
  onResume: (releaseName: string) => void
  onCancel: (releaseName: string) => void
  onRetry: (releaseName: string) => void
  onMoveToFront: (releaseName: string) => Promise<boolean>
  onDelete: (releaseName: string) => void
  onViewError: (item: DownloadItem) => void
  onConfirmKeep: (releaseName: string) => void
  onConfirmDelete: (releaseName: string) => void
  onConfirmCancel: () => void
  onOpenGameDialog: (item: DownloadItem) => void
}

const DownloadRow: React.FC<DownloadRowProps> = ({
  item,
  isInstalled,
  isConnected,
  sideloadingDisabled,
  confirmPending,
  onInstall,
  onUninstall,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onMoveToFront,
  onDelete,
  onViewError,
  onConfirmKeep,
  onConfirmDelete,
  onConfirmCancel,
  onOpenGameDialog
}) => {
  const pct = progressValue(item)
  const showBar = showProgressBar(item)

  const isActive =
    item.status === 'Downloading' ||
    item.status === 'Extracting' ||
    item.status === 'Installing' ||
    item.status === 'Queued'

  const isDeletable =
    item.status === 'Completed' ||
    item.status === 'Cancelled' ||
    item.status === 'Paused' ||
    item.status === 'Error' ||
    item.status === 'InstallError' ||
    item.status === 'Queued'

  const isErrorState = item.status === 'Error' || item.status === 'InstallError'

  return (
    <div className="group flex items-center gap-4 rounded-md px-3 py-3 hover:bg-accent transition-colors">
      {/* Thumbnail */}
      <button
        type="button"
        className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        onClick={() => onOpenGameDialog(item)}
        aria-label={`View details for ${item.gameName}`}
      >
        <img
          src={item.thumbnailPath ? `file://${item.thumbnailPath}` : placeholderImage}
          alt=""
          width={64}
          height={64}
          className="w-16 h-16 rounded-md object-cover bg-muted"
          onError={(e) => {
            const img = e.currentTarget
            if (img.src !== placeholderImage) img.src = placeholderImage
          }}
        />
      </button>

      {/* Info */}
      <button
        type="button"
        className="flex-1 min-w-0 flex flex-col gap-0.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        onClick={() => onOpenGameDialog(item)}
        aria-label={`View details for ${item.gameName}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{item.gameName}</span>
          {isInstalled && (
            <span className="flex-shrink-0 text-xs text-emerald-500 font-medium">Installed</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground font-mono truncate">{item.releaseName}</span>
        <span className="text-xs text-muted-foreground">{formatAddedTime(item.addedDate)}</span>
      </button>

      {/* Progress + status */}
      <div className="flex flex-col items-end gap-1.5 w-48 flex-shrink-0">
        {statusBadge(item)}

        {showBar && (
          <div className="w-full flex items-center gap-2">
            <Progress
              value={pct ?? 0}
              className="h-1 flex-1"
              aria-label="Transfer progress"
            />
            {pct !== null && (
              <span className="text-xs text-muted-foreground w-7 text-right flex-shrink-0 tabular-nums">
                {Math.round(pct)}%
              </span>
            )}
          </div>
        )}

        {item.status === 'Downloading' && item.eta && item.eta !== '-' && (
          <span className="text-xs text-muted-foreground">ETA {item.eta}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[6rem]">
        {/* Install (completed, not installed, connected, sideloading enabled) */}
        {item.status === 'Completed' && !isInstalled && !sideloadingDisabled && (
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs gap-1"
            disabled={!isConnected}
            onClick={() => onInstall(item.releaseName)}
            aria-label={!isConnected ? 'Connect a device to install' : 'Install game'}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Install
          </Button>
        )}

        {/* Uninstall (completed, installed, connected) */}
        {item.status === 'Completed' && isInstalled && !sideloadingDisabled && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            disabled={!isConnected}
            onClick={() => onUninstall(item)}
            aria-label={!isConnected ? 'Connect a device to uninstall' : 'Uninstall game'}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Uninstall
          </Button>
        )}

        {/* View error */}
        {isErrorState && (
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs gap-1 bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25"
            onClick={() => onViewError(item)}
          >
            <Info className="h-3.5 w-3.5" />
            View error
          </Button>
        )}

        {/* Pause (downloading) */}
        {item.status === 'Downloading' && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={() => onPause(item.releaseName)}
            aria-label="Pause download"
          >
            <Pause className="h-3.5 w-3.5" />
            Pause
          </Button>
        )}

        {/* Resume (paused) */}
        {item.status === 'Paused' && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={() => onResume(item.releaseName)}
            aria-label="Resume download"
          >
            <Play className="h-3.5 w-3.5" />
            Resume
          </Button>
        )}

        {/* Move to front (queued) */}
        {item.status === 'Queued' && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => onMoveToFront(item.releaseName)}
            aria-label="Download next"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Retry (cancelled or error) */}
        {(item.status === 'Cancelled' || isErrorState) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={() => onRetry(item.releaseName)}
            aria-label="Retry"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}

        {/* Cancel (active) */}
        {isActive && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => onCancel(item.releaseName)}
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Delete / inline confirm */}
        {isDeletable && (
          confirmPending === item.releaseName ? (
            <DeleteConfirm
              onKeep={() => onConfirmKeep(item.releaseName)}
              onDelete={() => onConfirmDelete(item.releaseName)}
              onCancel={onConfirmCancel}
            />
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={() => onDelete(item.releaseName)}
              aria-label="Remove from list"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DownloadsView
// ---------------------------------------------------------------------------

export interface DownloadsViewProps {
  onClose: () => void
}

const DownloadsView: React.FC<DownloadsViewProps> = ({ onClose }) => {
  const {
    queue,
    isLoading,
    error,
    removeFromQueue,
    removeFromQueueOnly,
    moveToFront,
    cancelDownload,
    retryDownload,
    pauseDownload,
    resumeDownload
  } = useDownload()

  const { selectedDevice, isConnected, loadPackages } = useAdb()
  const { games } = useGames()
  const [, setDialogGame] = useGameDialog()

  const [confirmPending, setConfirmPending] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [errorDetail, setErrorDetail] = useState<{
    error: string
    phase: ErrorPhase
    contextLabel: string
    releaseName: string
  } | null>(null)

  const sideloadingDisabled = getSideloadingDisabled()

  const isGameInstalled = (releaseName: string): boolean =>
    games.some((g) => g.releaseName === releaseName && g.isInstalled)

  const handleInstallFromCompleted = (releaseName: string): void => {
    if (!releaseName || !selectedDevice) {
      window.alert('Cannot start installation: Missing required information.')
      return
    }
    window.api.downloads.installFromCompleted(releaseName, selectedDevice).catch((err: unknown) => {
      console.error('Error triggering install from completed:', err)
      window.alert('Failed to start installation. Please check the main process logs.')
    })
  }

  const handleUninstall = async (item: DownloadItem): Promise<void> => {
    const game = games.find((g) => g.releaseName === item.releaseName)
    if (!game?.packageName || !selectedDevice) {
      window.alert('Cannot uninstall: Missing required information.')
      return
    }
    const confirmed = window.confirm(
      `Uninstall ${game.name} (${game.packageName})? This will remove the app and its data from the device.`
    )
    if (!confirmed) return
    try {
      const success = await window.api.adb.uninstallPackage(selectedDevice, game.packageName)
      if (success) {
        await loadPackages()
      } else {
        window.alert('Failed to uninstall the game.')
      }
    } catch (err) {
      console.error('Error during uninstall:', err)
      window.alert('An error occurred during uninstallation.')
    }
  }

  const handleDeleteButton = (releaseName: string): void => {
    const behavior = getDeleteOnRemove()
    if (behavior === 'delete') {
      removeFromQueue(releaseName)
    } else if (behavior === 'keep') {
      removeFromQueueOnly(releaseName)
    } else {
      // 'ask'
      setConfirmPending(releaseName)
    }
  }

  const handleClearCompleted = (): void => {
    queue
      .filter((i) => i.status === 'Completed' || i.status === 'Cancelled')
      .forEach((i) => removeFromQueueOnly(i.releaseName))
  }

  const handleScan = async (): Promise<void> => {
    setIsScanning(true)
    setScanResult(null)
    try {
      const { added, pruned } = await window.api.downloads.scanDownloadFolder()
      setScanResult(`Scan complete: ${added} registered, ${pruned} pruned`)
    } catch {
      setScanResult('Scan failed')
    } finally {
      setIsScanning(false)
    }
  }

  const openGameDialog = (item: DownloadItem): void => {
    let game = games.find((g) => g.releaseName === item.releaseName)
    if (!game) game = games.find((g) => g.packageName === item.packageName)
    if (game) setDialogGame(game)
    onClose()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin opacity-40" />
        <span className="text-sm">Loading download queue…</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="py-8">
        <p className="text-sm text-destructive">Error loading queue: {error}</p>
      </div>
    )
  }

  const hasClearable = queue.some((i) => i.status === 'Completed' || i.status === 'Cancelled')
  const sortedQueue = [...queue].sort((a, b) => b.addedDate - a.addedDate)

  return (
    <div className="flex flex-col gap-1 pb-8">
      {/* Action row */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          disabled={isScanning}
          onClick={handleScan}
          aria-label="Scan downloads folder"
        >
          {isScanning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Folder className="h-3.5 w-3.5" />
          )}
          {isScanning ? 'Scanning…' : 'Scan downloads'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs gap-1.5"
          disabled={!hasClearable}
          onClick={handleClearCompleted}
          aria-label="Clear completed and cancelled downloads"
        >
          <XCircle className="h-3.5 w-3.5" />
          Clear completed
        </Button>
        {scanResult && (
          <span className="text-xs text-muted-foreground ml-1">{scanResult}</span>
        )}
      </div>

      {/* Empty state */}
      {sortedQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <ArrowDownToLine className="h-10 w-10 opacity-20" />
          <span className="text-sm font-medium">No active downloads.</span>
          <span className="text-xs text-muted-foreground">Games you download will appear here.</span>
        </div>
      ) : (
        <div className="flex flex-col">
          {sortedQueue.map((item) => (
            <DownloadRow
              key={item.releaseName}
              item={item}
              isInstalled={isGameInstalled(item.releaseName)}
              isConnected={!!isConnected && !!selectedDevice}
              sideloadingDisabled={sideloadingDisabled}
              confirmPending={confirmPending}
              onInstall={handleInstallFromCompleted}
              onUninstall={handleUninstall}
              onPause={pauseDownload}
              onResume={resumeDownload}
              onCancel={cancelDownload}
              onRetry={retryDownload}
              onMoveToFront={moveToFront}
              onDelete={handleDeleteButton}
              onViewError={(it) =>
                setErrorDetail({
                  error: it.error || '',
                  phase: it.status === 'InstallError' ? 'install' : 'download',
                  contextLabel: `${it.gameName} (${it.releaseName})`,
                  releaseName: it.releaseName
                })
              }
              onConfirmKeep={(name) => {
                setConfirmPending(null)
                removeFromQueueOnly(name)
              }}
              onConfirmDelete={(name) => {
                setConfirmPending(null)
                removeFromQueue(name)
              }}
              onConfirmCancel={() => setConfirmPending(null)}
              onOpenGameDialog={openGameDialog}
            />
          ))}
        </div>
      )}

      {/* Error detail dialog */}
      <ErrorDetailDialog
        open={errorDetail !== null}
        onClose={() => setErrorDetail(null)}
        error={errorDetail?.error}
        phase={errorDetail?.phase ?? 'download'}
        contextLabel={errorDetail?.contextLabel}
        onRetry={
          errorDetail
            ? () => retryDownload(errorDetail.releaseName)
            : undefined
        }
      />
    </div>
  )
}

export default DownloadsView
