import React from 'react'
import { X, Trash2, RotateCcw, XCircle, ArrowUpToLine } from 'lucide-react'
import { useUpload } from '@renderer/hooks/useUpload'
import { useLanguage } from '@renderer/hooks/useLanguage'
import { UploadItem } from '@shared/types'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { Progress } from '@renderer/components/ui/progress'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(item: UploadItem): React.ReactNode {
  const label = chipLabel(item)
  switch (item.status) {
    case 'Queued':
    case 'Cancelled':
      return <Badge variant="secondary" className="text-xs h-5 px-1.5">{label}</Badge>
    case 'Preparing':
    case 'Uploading':
      return <Badge className="text-xs h-5 px-1.5">{label}</Badge>
    case 'Completed':
      return (
        <Badge className="text-xs h-5 px-1.5 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/15">
          {label}
        </Badge>
      )
    case 'Error':
      return <Badge variant="destructive" className="text-xs h-5 px-1.5">{label}</Badge>
    default:
      return <Badge variant="secondary" className="text-xs h-5 px-1.5">{label}</Badge>
  }
}

function chipLabel(item: UploadItem): string {
  switch (item.status) {
    case 'Queued':
      return 'Queued'
    case 'Preparing':
      return item.stage ? item.stage : 'Preparing'
    case 'Uploading':
      return item.stage ? item.stage : 'Uploading'
    case 'Completed':
      return 'Completed'
    case 'Error':
      return 'Error'
    case 'Cancelled':
      return 'Cancelled'
    default:
      return item.status
  }
}

// ---------------------------------------------------------------------------
// Upload row
// ---------------------------------------------------------------------------

const UploadRow: React.FC<{ item: UploadItem }> = ({ item }) => {
  const { removeFromQueue, cancelUpload, retryUpload } = useUpload()
  const { t } = useLanguage()

  const showBar = item.status === 'Preparing' || item.status === 'Uploading'
  const pct = item.progress ?? 0

  const isActive =
    item.status === 'Queued' ||
    item.status === 'Preparing' ||
    item.status === 'Uploading'

  const isDeletable =
    item.status === 'Completed' ||
    item.status === 'Error' ||
    item.status === 'Cancelled' ||
    item.status === 'Queued'

  const isRetryable = item.status === 'Error' || item.status === 'Cancelled'

  return (
    <div className="group flex items-center gap-4 rounded-md px-3 py-3 hover:bg-accent transition-colors">
      {/* Icon placeholder (uploads don't have thumbnails) */}
      <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center">
        <ArrowUpToLine className="h-7 w-7 text-muted-foreground/40" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground truncate">{item.gameName}</span>
        <span className="text-xs text-muted-foreground truncate">
          {item.isLocalUpload ? (
            <em className="not-italic text-muted-foreground">Local upload</em>
          ) : (
            item.packageName
          )}
        </span>
        {item.versionCode > 0 && (
          <span className="text-xs text-muted-foreground">v{item.versionCode}</span>
        )}
      </div>

      {/* Progress + status */}
      <div className="flex flex-col items-end gap-1.5 w-48 flex-shrink-0">
        {statusBadge(item)}

        {showBar && (
          <div className="w-full flex items-center gap-2">
            <Progress
              value={pct}
              className="h-1 flex-1"
              aria-label="Upload progress"
            />
            <span className="text-xs text-muted-foreground w-7 text-right flex-shrink-0 tabular-nums">
              {Math.round(pct)}%
            </span>
          </div>
        )}

        {item.status === 'Error' && item.error && (
          <span className="text-xs text-destructive text-right line-clamp-2 max-w-full">
            {item.error}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Cancel active */}
        {isActive && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground"
            aria-label={t('cancelUpload')}
            onClick={() => cancelUpload(item.packageName)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Retry */}
        {isRetryable && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground"
            aria-label={t('retryUpload')}
            onClick={() => retryUpload(item.packageName)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Remove */}
        {isDeletable && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground"
            aria-label={
              item.status === 'Completed' ? t('removeFromHistory') : t('removeFromQueue')
            }
            onClick={() => removeFromQueue(item.packageName)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// UploadsView
// ---------------------------------------------------------------------------

const UploadsView: React.FC = () => {
  const { queue, clearCompleted } = useUpload()

  const hasClearable = queue.some(
    (i) => i.status === 'Completed' || i.status === 'Cancelled'
  )

  return (
    <div className="flex flex-col gap-1 pb-8">
      {/* Action row */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs gap-1.5"
          disabled={!hasClearable}
          onClick={clearCompleted}
          aria-label="Clear completed and cancelled uploads"
        >
          <XCircle className="h-3.5 w-3.5" />
          Clear completed
        </Button>
      </div>

      {/* Empty state */}
      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <ArrowUpToLine className="h-10 w-10 opacity-20" />
          <span className="text-sm font-medium">No active uploads.</span>
          <span className="text-xs text-muted-foreground">
            Games you upload to VRSource will appear here.
          </span>
        </div>
      ) : (
        <div className="flex flex-col">
          {queue.map((item) => (
            <UploadRow key={item.packageName} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export default UploadsView
