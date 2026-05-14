import React from 'react'
import { useAdb } from '../hooks/useAdb'
import { useGames } from '../hooks/useGames'
import { useSettings } from '../hooks/useSettings'

// Quest-style status panel shown in the app shell. Each row is a calm
// label + value pair — no terminal jargon, no glow, no jokes.
const StatusPanel: React.FC = () => {
  const { isConnected, selectedDeviceDetails } = useAdb()
  const { games } = useGames()
  const { serverConfig } = useSettings()

  const hasServer = serverConfig?.baseUri?.length > 0
  const totalGames = games.filter((g) => {
    const s = String(g.size ?? '').trim()
    return s !== '0 MB' && s !== ''
  }).length
  const installedGames = games.filter((g) => g.isInstalled).length
  const updatesAvailable = games.filter((g) => g.hasUpdate).length
  const deviceName = selectedDeviceDetails?.friendlyModelName ?? null

  const row = (
    label: string,
    value: string,
    tone: 'default' | 'good' | 'warn' | 'dim' = 'default'
  ): React.JSX.Element => {
    const color =
      tone === 'good' ? 'var(--quest-success)'
        : tone === 'warn' ? 'var(--quest-warn)'
          : tone === 'dim' ? 'var(--quest-text-dim)'
            : 'var(--quest-text)'
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <span style={{ color: 'var(--quest-text-muted)', fontSize: 11 }}>{label}</span>
        <span
          style={{
            color,
            fontSize: 12,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 140
          }}
        >
          {value}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 18px',
        borderRight: '1px solid var(--quest-border)',
        flexShrink: 0,
        overflow: 'hidden'
      }}
    >
      {row('Server', hasServer ? 'Online' : 'Not configured', hasServer ? 'good' : 'warn')}
      {row(
        'Device',
        isConnected && deviceName ? deviceName : 'Not connected',
        isConnected ? 'good' : 'dim'
      )}
      {row('Library', totalGames ? `${totalGames.toLocaleString()} games` : 'Empty')}
      {installedGames > 0 && row('Installed', String(installedGames))}
      {updatesAvailable > 0 && row('Updates', `${updatesAvailable} ready`, 'good')}
    </div>
  )
}

export default StatusPanel
