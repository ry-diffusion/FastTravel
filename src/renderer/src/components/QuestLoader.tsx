import React from 'react'
import { Progress } from '@renderer/components/ui/progress'

interface QuestLoaderProps {
  title: string
  subtitle?: string
  progress?: number | null
}

/**
 * Centered loading screen shown while dependencies initialise.
 * Uses shadcn Progress in indeterminate style when progress is null/undefined.
 */
const QuestLoader: React.FC<QuestLoaderProps> = ({ title, subtitle, progress }) => {
  const isIndeterminate = progress == null

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        {/* Brand mark */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <div className="h-6 w-6 rounded-full bg-primary opacity-80" />
        </div>

        {/* Title + subtitle */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          {isIndeterminate ? (
            /* Indeterminate: animate the bar between 0→85→0 using CSS */
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{ animation: 'quest-indeterminate 1.8s ease-in-out infinite' }}
              />
              <style>{`
                @keyframes quest-indeterminate {
                  0%   { left: -40%; width: 40%; }
                  50%  { left: 30%;  width: 50%; }
                  100% { left: 110%; width: 40%; }
                }
              `}</style>
            </div>
          ) : (
            <Progress value={progress} className="h-1.5" />
          )}

          {!isIndeterminate && (
            <p className="text-xs text-muted-foreground">{Math.round(progress!)}%</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuestLoader
