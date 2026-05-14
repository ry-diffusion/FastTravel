import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Chip, Progress } from '@heroui/react'
import { useDownload } from '../hooks/useDownload'
import { useUpload } from '@renderer/hooks/useUpload'
import { DownloadItem, UploadItem } from '@shared/types'
import { ArrowDownloadRegular, ArrowUploadRegular } from '@fluentui/react-icons'

type Entry = {
  key: string
  direction: 'down' | 'up'
  name: string
  stage: string
  progress: number | null
  speed?: string
  eta?: string
}

const downloadStageLabel = (status: DownloadItem['status']): string => {
  switch (status) {
    case 'Queued':
      return 'Queued'
    case 'Downloading':
      return 'Downloading'
    case 'Extracting':
      return 'Extracting'
    case 'Installing':
      return 'Installing'
    case 'Paused':
      return 'Paused'
    default:
      return String(status)
  }
}

const uploadStageLabel = (item: UploadItem): string => {
  if (item.stage) {
    const s = item.stage
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  }
  const s = String(item.status)
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

/**
 * Compact Meta-style transfer status strip. Shows nothing when idle; when one
 * or more transfers are active, shows a single Chip row with direction icon,
 * name, stage, a thin Progress bar, and optional speed / ETA. Multiple
 * transfers rotate through every 4 s.
 */
const TransferStrip: React.FC = () => {
  const { queue: downloadQueue } = useDownload()
  const { queue: uploadQueue } = useUpload()

  const entries = useMemo<Entry[]>(() => {
    const downloads: Entry[] = downloadQueue
      .filter((d) => ['Queued', 'Downloading', 'Extracting', 'Installing'].includes(d.status))
      .map((d) => ({
        key: `d:${d.releaseName}`,
        direction: 'down',
        name: d.gameName,
        stage: downloadStageLabel(d.status),
        progress:
          d.status === 'Extracting' && typeof d.extractProgress === 'number'
            ? d.extractProgress
            : typeof d.progress === 'number'
              ? d.progress
              : null,
        speed: d.status === 'Downloading' ? d.speed : undefined,
        eta: d.status === 'Downloading' ? d.eta : undefined
      }))
    const uploads: Entry[] = uploadQueue
      .filter((u) => ['Queued', 'Preparing', 'Uploading'].includes(u.status))
      .map((u) => ({
        key: `u:${u.packageName}`,
        direction: 'up',
        name: u.gameName,
        stage: uploadStageLabel(u),
        progress: typeof u.progress === 'number' ? u.progress : null
      }))
    return [...downloads, ...uploads]
  }, [downloadQueue, uploadQueue])

  const [index, setIndex] = useState(0)
  const indexRef = useRef(index)
  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    if (entries.length <= 1) {
      if (index !== 0) setIndex(0)
      return
    }
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % entries.length)
    }, 4000)
    return () => clearInterval(id)
  }, [entries.length, index])

  if (entries.length === 0) {
    // Collapse entirely when idle — no decorative placeholder.
    return null
  }

  const safeIndex = Math.min(index, entries.length - 1)
  const e = entries[safeIndex]
  const progressPct = e.progress != null ? Math.max(0, Math.min(100, e.progress)) : null
  const hasProgress = progressPct !== null

  return (
    <div className="flex items-center gap-3 w-full min-w-0 py-1.5 px-1">
      {/* Direction chip */}
      <Chip
        size="sm"
        variant="flat"
        color="primary"
        startContent={
          e.direction === 'down' ? (
            <ArrowDownloadRegular fontSize={12} />
          ) : (
            <ArrowUploadRegular fontSize={12} />
          )
        }
        className="shrink-0"
      >
        {e.direction === 'down' ? 'Download' : 'Upload'}
      </Chip>

      {/* Game name */}
      <span
        className="text-small font-medium text-foreground truncate shrink min-w-0 max-w-[36%]"
        title={e.name}
      >
        {e.name}
      </span>

      {/* Stage */}
      <span className="text-small text-default-500 shrink-0">{e.stage}</span>

      {/* Progress bar + percentage */}
      {hasProgress && (
        <>
          <Progress
            aria-label={`${e.name} ${e.stage}`}
            value={progressPct ?? 0}
            color="primary"
            size="sm"
            className="flex-1 min-w-[60px]"
            classNames={{
              track: 'bg-default-100',
              indicator: 'transition-[width] duration-300 ease-linear'
            }}
          />
          <span className="text-small text-default-600 shrink-0 min-w-[38px] text-right tabular-nums">
            {(progressPct ?? 0).toFixed(0)}%
          </span>
        </>
      )}

      {/* Speed */}
      {e.speed && (
        <span className="text-small text-default-500 shrink-0">{e.speed}</span>
      )}

      {/* ETA */}
      {e.eta && (
        <span className="text-small text-default-400 shrink-0">ETA {e.eta}</span>
      )}

      {/* Rotation indicator */}
      {entries.length > 1 && (
        <span className="text-tiny text-default-400 shrink-0 ml-auto">
          {safeIndex + 1}/{entries.length}
        </span>
      )}
    </div>
  )
}

export default TransferStrip
