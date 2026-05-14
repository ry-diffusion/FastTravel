import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDownload } from '../hooks/useDownload'
import { useUpload } from '@renderer/hooks/useUpload'
import { DownloadItem, UploadItem } from '@shared/types'

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
 * Compact Meta-style transfer status. Shows nothing when idle; when one or
 * more transfers are active, shows a single pill with direction arrow, name,
 * stage, and progress. Multiple transfers rotate through every 4 s.
 */
const TransferStrip: React.FC = () => {
  const { queue: downloadQueue } = useDownload()
  const { queue: uploadQueue } = useUpload()

  const entries = useMemo<Entry[]>(() => {
    const downloads: Entry[] = downloadQueue
      .filter((d) =>
        ['Queued', 'Downloading', 'Extracting', 'Installing'].includes(d.status)
      )
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
    // Collapse entirely when nothing is happening — no decorative idle copy.
    return null
  }

  const safeIndex = Math.min(index, entries.length - 1)
  const e = entries[safeIndex]
  const progressPct = e.progress != null ? Math.max(0, Math.min(100, e.progress)) : null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        minWidth: 0,
        color: 'var(--quest-text-muted)',
        fontSize: 13
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--quest-text)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 600,
          flexShrink: 0
        }}
        aria-label={e.direction === 'down' ? 'Downloading' : 'Uploading'}
      >
        {e.direction === 'down' ? '↓' : '↑'}
      </span>
      <span
        style={{
          color: 'var(--quest-text)',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexShrink: 1,
          minWidth: 0,
          maxWidth: '40%'
        }}
        title={e.name}
      >
        {e.name}
      </span>
      <span style={{ flexShrink: 0 }}>{e.stage}</span>
      {progressPct !== null && (
        <>
          <div
            style={{
              flex: 1,
              minWidth: 60,
              height: 4,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: 'var(--vrcd-neon)',
                borderRadius: 999,
                transition: 'width 0.3s linear'
              }}
            />
          </div>
          <span style={{ color: 'var(--quest-text)', flexShrink: 0, minWidth: 38, textAlign: 'right' }}>
            {progressPct.toFixed(0)}%
          </span>
        </>
      )}
      {e.speed && <span style={{ flexShrink: 0 }}>{e.speed}</span>}
      {e.eta && <span style={{ color: 'var(--quest-text-dim)', flexShrink: 0 }}>ETA {e.eta}</span>}
      {entries.length > 1 && (
        <span
          style={{
            color: 'var(--quest-text-dim)',
            flexShrink: 0,
            marginLeft: 'auto'
          }}
        >
          {safeIndex + 1} of {entries.length}
        </span>
      )}
    </div>
  )
}

export default TransferStrip
