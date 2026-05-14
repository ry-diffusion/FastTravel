import React, { useState } from 'react'
import { Button, Chip, Image, Progress, Spinner, cn } from '@heroui/react'
import {
  FolderRegular,
  DismissCircleRegular,
  PauseRegular,
  PlayRegular,
  ArrowUpRegular,
  DismissRegular,
  ArrowCounterclockwiseRegular,
  InfoRegular,
  DeleteRegular,
  ArrowDownloadRegular,
  BroomRegular
} from '@fluentui/react-icons'
import { formatDistanceToNow } from 'date-fns'
import { useDownload } from '../hooks/useDownload'
import { useAdb } from '../hooks/useAdb'
import { useGames } from '@renderer/hooks/useGames'
import { useGameDialog } from '@renderer/hooks/useGameDialog'
import { getDeleteOnRemove, getSideloadingDisabled } from '../hooks/useExtrasSettings'
import { DownloadItem } from '@shared/types'
import ErrorDetailDialog, { ErrorPhase } from './ErrorDetailDialog'
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

type StatusChipColor = 'default' | 'primary' | 'success' | 'danger' | 'warning'

function statusChipColor(status: DownloadItem['status']): StatusChipColor {
  switch (status) {
    case 'Downloading':
    case 'Extracting':
    case 'Installing':
      return 'primary'
    case 'Completed':
      return 'success'
    case 'Error':
    case 'InstallError':
      return 'danger'
    default:
      return 'default'
  }
}

function statusLabel(item: DownloadItem): string {
  switch (item.status) {
    case 'Queued':
      return 'Queued'
    case 'Downloading':
      return `Downloading${item.speed ? ` · ${item.speed}` : ''}`
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
      return 'Install Error'
    default:
      return status
  }
}

function progressValue(item: DownloadItem): number | undefined {
  switch (item.status) {
    case 'Downloading':
    case 'Paused':
      return item.progress
    case 'Extracting':
      return item.extractProgress
    case 'Installing':
      return item.progress || 0
    default:
      return undefined
  }
}

function showProgress(item: DownloadItem): boolean {
  return (
    item.status === 'Downloading' ||
    item.status === 'Extracting' ||
    item.status === 'Paused' ||
    item.status === 'Installing'
  )
}

// ---------------------------------------------------------------------------
// DeleteConfirmBanner
// ---------------------------------------------------------------------------

interface DeleteConfirmBannerProps {
  onKeep: () => void
  onDelete: () => void
  onCancel: () => void
}

const DeleteConfirmBanner: React.FC<DeleteConfirmBannerProps> = ({
  onKeep,
  onDelete,
  onCancel
}) => (
  <div className="flex items-center gap-2 rounded-medium bg-warning-50/10 border border-warning-200/30 px-3 py-2 text-xs">
    <span className="text-warning-500 font-medium whitespace-nowrap">Delete files too?</span>
    <Button
      size="sm"
      variant="light"
      color="default"
      className="h-6 min-w-0 px-2 text-xs"
      onClick={onKeep}
    >
      Keep files
    </Button>
    <Button
      size="sm"
      variant="light"
      color="danger"
      className="h-6 min-w-0 px-2 text-xs"
      onClick={onDelete}
    >
      Delete
    </Button>
    <Button
      isIconOnly
      size="sm"
      variant="light"
      className="h-6 w-6 min-w-0 text-default-400"
      onClick={onCancel}
    >
      <DismissRegular className="h-3 w-3" />
    </Button>
  </div>
)

// ---------------------------------------------------------------------------
// DownloadRow
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
  onMoveToFront: (releaseName: string) => void
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
  const showBar = showProgress(item)
  const chipColor = statusChipColor(item.status)

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
    <div
      className={cn(
        'group flex items-center gap-4 rounded-large px-4 py-3 transition-colors duration-100',
        'hover:bg-white/[0.03]'
      )}
    >
      {/* Thumbnail */}
      <div
        className="flex-shrink-0 cursor-pointer"
        onClick={() => onOpenGameDialog(item)}
        title="View game details"
      >
        <Image
          src={item.thumbnailPath ? `file://${item.thumbnailPath}` : placeholderImage}
          alt={`${item.gameName} thumbnail`}
          width={64}
          height={64}
          radius="md"
          className="object-cover w-16 h-16"
          fallbackSrc={placeholderImage}
        />
      </div>

      {/* Info */}
      <div
        className="flex-1 min-w-0 flex flex-col gap-0.5 cursor-pointer"
        onClick={() => onOpenGameDialog(item)}
        title="View game details"
      >
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium text-sm truncate">{item.gameName}</span>
          {isInstalled && (
            <Chip size="sm" color="success" variant="flat" className="h-4 text-xs flex-shrink-0">
              Installed
            </Chip>
          )}
        </div>
        <span className="text-default-500 text-xs truncate">{item.releaseName}</span>
        <span className="text-default-400 text-xs">{formatAddedTime(item.addedDate)}</span>
      </div>

      {/* Progress + status */}
      <div className="flex flex-col items-end gap-1.5 w-44 flex-shrink-0">
        <Chip
          size="sm"
          color={chipColor}
          variant="flat"
          className="text-xs h-5"
        >
          {statusLabel(item)}
        </Chip>

        {showBar && (
          <div className="w-full flex items-center gap-2">
            <Progress
              size="sm"
              value={pct}
              isIndeterminate={pct === undefined}
              color={chipColor === 'danger' ? 'danger' : 'primary'}
              className="flex-1"
              aria-label="Transfer progress"
            />
            {pct !== undefined && (
              <span className="text-default-400 text-xs w-7 text-right flex-shrink-0">
                {Math.round(pct)}%
              </span>
            )}
          </div>
        )}

        {item.status === 'Downloading' && item.eta && item.eta !== '-' && (
          <span className="text-default-400 text-xs">ETA {item.eta}</span>
        )}

        {/* Install / Uninstall buttons for Completed */}
        {item.status === 'Completed' && !isInstalled && !sideloadingDisabled && (
          <Button
            size="sm"
            color="primary"
            variant="flat"
            startContent={<ArrowDownloadRegular className="h-3.5 w-3.5" />}
            isDisabled={!isConnected}
            onClick={() => onInstall(item.releaseName)}
            title={!isConnected ? 'Connect a device to install' : 'Install game'}
            className="h-7 text-xs"
          >
            Install
          </Button>
        )}

        {item.status === 'Completed' && isInstalled && !sideloadingDisabled && (
          <Button
            size="sm"
            variant="bordered"
            startContent={<BroomRegular className="h-3.5 w-3.5" />}
            isDisabled={!isConnected}
            onClick={() => onUninstall(item)}
            title={!isConnected ? 'Connect a device to uninstall' : 'Uninstall game'}
            className="h-7 text-xs text-default-500"
          >
            Uninstall
          </Button>
        )}

        {/* Error action */}
        {isErrorState && (
          <Button
            size="sm"
            color="danger"
            variant="flat"
            startContent={<InfoRegular className="h-3.5 w-3.5" />}
            onClick={() => onViewError(item)}
            className="h-7 text-xs"
          >
            View error
          </Button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 w-20">
        {/* Pause */}
        {item.status === 'Downloading' && (
          <Button
            size="sm"
            variant="light"
            startContent={<PauseRegular className="h-3.5 w-3.5" />}
            onClick={() => onPause(item.releaseName)}
            title="Pause download"
            className="h-7 text-xs text-default-500"
          >
            Pause
          </Button>
        )}

        {/* Resume */}
        {item.status === 'Paused' && (
          <Button
            size="sm"
            variant="light"
            startContent={<PlayRegular className="h-3.5 w-3.5" />}
            onClick={() => onResume(item.releaseName)}
            title="Resume download"
            className="h-7 text-xs text-default-500"
          >
            Resume
          </Button>
        )}

        {/* Bump to front (Queued only) */}
        {item.status === 'Queued' && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onClick={() => onMoveToFront(item.releaseName)}
            title="Download next"
            className="h-7 w-7 text-default-400"
          >
            <ArrowUpRegular className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Retry */}
        {(item.status === 'Cancelled' || isErrorState) && (
          <Button
            size="sm"
            variant="light"
            startContent={<ArrowCounterclockwiseRegular className="h-3.5 w-3.5" />}
            onClick={() => onRetry(item.releaseName)}
            title="Retry"
            className="h-7 text-xs text-default-500"
          >
            Retry
          </Button>
        )}

        {/* Cancel (active items) */}
        {isActive && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onClick={() => onCancel(item.releaseName)}
            title="Cancel"
            className="h-7 w-7 text-default-400"
          >
            <DismissRegular className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Delete / remove */}
        {isDeletable && (
          confirmPending === item.releaseName ? (
            <DeleteConfirmBanner
              onKeep={() => onConfirmKeep(item.releaseName)}
              onDelete={() => onConfirmDelete(item.releaseName)}
              onCancel={onConfirmCancel}
            />
          ) : (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onClick={() => onDelete(item.releaseName)}
              title="Remove from list"
              className="h-7 w-7 text-default-400"
            >
              <DeleteRegular className="h-3.5 w-3.5" />
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

interface DownloadsViewProps {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setDialogGame] = useGameDialog()

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
    window.api.downloads.installFromCompleted(releaseName, selectedDevice).catch((err) => {
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
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-default-400">
        <Spinner size="md" color="primary" />
        <span className="text-sm">Loading download queue…</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col gap-4 py-8">
        <p className="text-danger text-sm">Error loading queue: {error}</p>
      </div>
    )
  }

  const hasClearable = queue.some((i) => i.status === 'Completed' || i.status === 'Cancelled')
  const sortedQueue = [...queue].sort((a, b) => b.addedDate - a.addedDate)

  return (
    <div className="flex flex-col gap-2 pb-8">
      {/* Header actions */}
      <div className="flex items-center gap-2 mb-2">
        <Button
          size="sm"
          variant="bordered"
          startContent={<FolderRegular className="h-3.5 w-3.5" />}
          isLoading={isScanning}
          onClick={handleScan}
          className="h-8 text-xs text-default-500"
        >
          {isScanning ? 'Scanning…' : 'Scan downloads'}
        </Button>
        <Button
          size="sm"
          variant="light"
          startContent={<DismissCircleRegular className="h-3.5 w-3.5" />}
          isDisabled={!hasClearable}
          onClick={handleClearCompleted}
          className="h-8 text-xs text-default-500"
        >
          Clear completed
        </Button>
        {scanResult && (
          <span className="text-default-400 text-xs ml-1">{scanResult}</span>
        )}
      </div>

      {/* Empty state */}
      {sortedQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-default-400">
          <ArrowDownloadRegular className="h-10 w-10 opacity-30" />
          <span className="text-sm font-medium">No active transfers.</span>
          <span className="text-xs text-default-300">
            Games you download will appear here.
          </span>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.04]">
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
        phase={errorDetail?.phase || 'download'}
        contextLabel={errorDetail?.contextLabel}
        onRetry={errorDetail ? () => retryDownload(errorDetail.releaseName) : undefined}
      />
    </div>
  )
}

export default DownloadsView
