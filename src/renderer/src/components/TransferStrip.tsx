import React, { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpToLine } from 'lucide-react'
import { Badge } from '@renderer/components/ui/badge'
import { Progress } from '@renderer/components/ui/progress'
import { useDownload } from '@renderer/hooks/useDownload'
import { useUpload } from '@renderer/hooks/useUpload'

interface TransferEntry {
  id: string
  name: string
  stage: string
  progress: number
  speed?: string
  eta?: string
  direction: 'down' | 'up'
}

const ACTIVE_DOWNLOAD_STATUSES = ['Queued', 'Downloading', 'Extracting', 'Installing']
const ACTIVE_UPLOAD_STATUSES = ['Queued', 'Preparing', 'Uploading']
const ROTATE_INTERVAL_MS = 4000

/**
 * Thin strip shown at the top of the main pane when transfers are active.
 * Returns null when idle.
 */
const TransferStrip: React.FC = () => {
  const { queue: downloadQueue } = useDownload()
  const { queue: uploadQueue } = useUpload()

  const activeEntries = useMemo((): TransferEntry[] => {
    const downs: TransferEntry[] = downloadQueue
      .filter((d) => ACTIVE_DOWNLOAD_STATUSES.includes(d.status))
      .map((d) => ({
        id: `dl:${d.releaseName}`,
        name: d.gameName || d.releaseName,
        stage: d.status,
        progress: d.progress ?? 0,
        speed: d.speed,
        eta: d.eta,
        direction: 'down' as const
      }))

    const ups: TransferEntry[] = uploadQueue
      .filter((u) => ACTIVE_UPLOAD_STATUSES.includes(u.status))
      .map((u) => ({
        id: `ul:${u.packageName}`,
        name: u.gameName || u.packageName,
        stage: u.stage ?? u.status,
        progress: u.progress ?? 0,
        direction: 'up' as const
      }))

    return [...downs, ...ups]
  }, [downloadQueue, uploadQueue])

  const [index, setIndex] = useState(0)

  // Keep index in-bounds when entries change
  useEffect(() => {
    if (activeEntries.length === 0) return
    setIndex((prev) => (prev >= activeEntries.length ? 0 : prev))
  }, [activeEntries.length])

  // Rotate every 4 s when there are multiple entries
  useEffect(() => {
    if (activeEntries.length <= 1) return
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % activeEntries.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [activeEntries.length])

  if (activeEntries.length === 0) return null

  const entry = activeEntries[index]
  const pct = Math.min(100, Math.max(0, Math.round(entry.progress)))

  const meta: string[] = [entry.stage]
  if (entry.speed) meta.push(entry.speed)
  if (entry.eta) meta.push(`ETA ${entry.eta}`)

  return (
    <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2">
      {/* Direction badge */}
      <Badge variant="secondary" className="shrink-0 gap-1 px-2 py-0.5 text-xs">
        {entry.direction === 'down' ? (
          <ArrowDownToLine className="h-3 w-3" />
        ) : (
          <ArrowUpToLine className="h-3 w-3" />
        )}
        {entry.direction === 'down' ? 'Download' : 'Upload'}
      </Badge>

      {/* Name */}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.name}</span>

      {/* Stage / speed / ETA */}
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
        {meta.join(' · ')}
      </span>

      {/* Progress bar */}
      <Progress value={pct} className="h-1 w-24 shrink-0" />

      {/* Percentage */}
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {pct}%
      </span>

      {/* Indicator when multiple entries */}
      {activeEntries.length > 1 && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {index + 1}/{activeEntries.length}
        </span>
      )}
    </div>
  )
}

export default TransferStrip
