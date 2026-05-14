import React from 'react'

interface QuestLoaderProps {
  /** Big bold heading line (e.g. "Checking network connectivity"). */
  title: string
  /** Optional secondary line under the title. */
  subtitle?: string
  /**
   * 0–100 if the work is determinate. When omitted, the bar animates
   * indeterminately like the Meta Quest "cast is loading" indicator.
   */
  progress?: number | null
}

/**
 * Meta Quest cast-loading-style indicator: a thin horizontal track with a
 * short Quest-blue segment, a large title, and an optional subtitle. Used
 * in place of the old circular Fluent spinner for any long-running setup
 * or system-busy state.
 */
const QuestLoader: React.FC<QuestLoaderProps> = ({ title, subtitle, progress }) => {
  const determinate = typeof progress === 'number' && Number.isFinite(progress)
  const pct = determinate ? Math.max(0, Math.min(100, progress as number)) : 0

  return (
    <div className="quest-loader">
      <div className="quest-loader__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={determinate ? pct : undefined}>
        {determinate ? (
          <div className="quest-loader__fill" style={{ width: `${pct}%` }} />
        ) : (
          <div className="quest-loader__indeterminate" />
        )}
      </div>
      <div className="quest-loader__text">
        <h2 className="quest-loader__title">{title}</h2>
        {subtitle && <p className="quest-loader__subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}

export default QuestLoader
