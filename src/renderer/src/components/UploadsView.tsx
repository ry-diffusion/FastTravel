import React from 'react'
import { Button, Chip, Progress } from '@heroui/react'
import { X, Trash2, RotateCcw, XCircle, ArrowUpToLine } from 'lucide-react'
import { useUpload } from '../hooks/useUpload'
import { useLanguage } from '../hooks/useLanguage'
import { UploadItem } from '@shared/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StatusChipColor = 'default' | 'primary' | 'success' | 'danger'

function chipColor(status: UploadItem['status']): StatusChipColor {
  switch (status) {
    case 'Preparing':
    case 'Uploading':
      return 'primary'
    case 'Completed':
      return 'success'
    case 'Error':
      return 'danger'
    default:
      return 'default'
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
// UploadRow
// ---------------------------------------------------------------------------

const UploadRow: React.FC<{ item: UploadItem }> = ({ item }) => {
  const { removeFromQueue, cancelUpload, retryUpload } = useUpload()
  const { t } = useLanguage()

  const color = chipColor(item.status)
  const pct = item.progress || 0
  const showBar = item.status === 'Preparing' || item.status === 'Uploading'

  return (
    <div className="group flex items-center gap-4 rounded-large px-4 py-3 transition-colors duration-100 hover:bg-content2">
      {/* Icon placeholder */}
      <div className="flex-shrink-0 w-16 h-16 rounded-medium bg-content2 flex items-center justify-center">
        <ArrowUpToLine size={28} className="text-default-300" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-foreground font-medium text-sm truncate">{item.gameName}</span>
        <span className="text-default-500 text-xs truncate">
          {item.isLocalUpload ? (
            <em className="text-default-400 not-italic">Local upload</em>
          ) : (
            item.packageName
          )}
        </span>
        {item.versionCode > 0 && (
          <span className="text-default-400 text-xs">v{item.versionCode}</span>
        )}
      </div>

      {/* Progress + status */}
      <div className="flex flex-col items-end gap-1.5 w-44 flex-shrink-0">
        <Chip size="sm" color={color} variant="flat" className="text-xs h-5">
          {chipLabel(item)}
        </Chip>

        {showBar && (
          <div className="w-full flex items-center gap-2">
            <Progress
              size="sm"
              value={pct}
              color="primary"
              className="flex-1"
              aria-label="Upload progress"
            />
            <span className="text-default-400 text-xs w-7 text-right flex-shrink-0">
              {Math.round(pct)}%
            </span>
          </div>
        )}

        {item.status === 'Error' && item.error && (
          <span className="text-danger text-xs text-right line-clamp-2 max-w-full">
            {item.error}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Cancel active */}
        {(item.status === 'Queued' ||
          item.status === 'Preparing' ||
          item.status === 'Uploading') && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label={t('cancelUpload')}
            onPress={() => cancelUpload(item.packageName)}
            title={t('cancelUpload')}
            className="h-7 w-7 text-default-400"
          >
            <X size={14} />
          </Button>
        )}

        {/* Retry */}
        {(item.status === 'Error' || item.status === 'Cancelled') && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label={t('retryUpload')}
            onPress={() => retryUpload(item.packageName)}
            title={t('retryUpload')}
            className="h-7 w-7 text-default-400"
          >
            <RotateCcw size={14} />
          </Button>
        )}

        {/* Remove */}
        {(item.status === 'Completed' ||
          item.status === 'Error' ||
          item.status === 'Cancelled' ||
          item.status === 'Queued') && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label={
              item.status === 'Completed' ? t('removeFromHistory') : t('removeFromQueue')
            }
            onPress={() => removeFromQueue(item.packageName)}
            title={
              item.status === 'Completed' ? t('removeFromHistory') : t('removeFromQueue')
            }
            className="h-7 w-7 text-default-400"
          >
            <Trash2 size={14} />
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
    <div className="flex flex-col gap-2 pb-8">
      {/* Header actions */}
      <div className="flex items-center gap-2 mb-2">
        <Button
          size="sm"
          variant="light"
          startContent={<XCircle size={14} />}
          isDisabled={!hasClearable}
          onPress={clearCompleted}
          className="h-8 text-xs text-default-500"
        >
          Clear completed
        </Button>
      </div>

      {/* Empty state */}
      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-default-400">
          <ArrowUpToLine size={40} className="opacity-30" />
          <span className="text-sm font-medium">No active uploads.</span>
          <span className="text-xs text-default-500">
            Games you upload to VRSource will appear here.
          </span>
        </div>
      ) : (
        /* Upload rows */
        <div className="flex flex-col divide-y divide-divider">
          {queue.map((item) => (
            <UploadRow key={item.packageName} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export default UploadsView
