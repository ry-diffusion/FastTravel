import React from 'react'
import { Progress } from '@heroui/react'

interface QuestLoaderProps {
  /** Big bold heading line (e.g. "Checking network connectivity"). */
  title: string
  /** Optional secondary line under the title. */
  subtitle?: string
  /**
   * 0–100 if the work is determinate. When omitted or null, the bar animates
   * indeterminately.
   */
  progress?: number | null
}

/**
 * Meta Quest cast-loading-style indicator: a thin HeroUI progress bar,
 * a large title, and an optional subtitle.
 */
const QuestLoader: React.FC<QuestLoaderProps> = ({ title, subtitle, progress }) => {
  const determinate = typeof progress === 'number' && Number.isFinite(progress)
  const pct = determinate ? Math.max(0, Math.min(100, progress as number)) : undefined

  return (
    <div className="flex flex-col gap-6 items-start w-full max-w-[560px]">
      <Progress
        aria-label={title}
        value={pct}
        isIndeterminate={!determinate}
        color="primary"
        size="sm"
        className="w-full"
        classNames={{
          track: 'bg-default-100',
          indicator: 'bg-primary'
        }}
      />
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-3xl font-bold text-foreground leading-tight tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="m-0 text-base text-default-500 leading-relaxed">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

export default QuestLoader
