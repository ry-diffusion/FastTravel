import React from 'react'
import {
  HeadsetVrRegular,
  LibraryRegular,
  ArrowDownloadRegular,
  SettingsRegular,
  QuestionCircleRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular
} from '@fluentui/react-icons'
import { useAdb } from '../hooks/useAdb'
import { useGames } from '../hooks/useGames'
import { useSettings } from '../hooks/useSettings'
import { useDownload } from '../hooks/useDownload'
import { useUpload } from '@renderer/hooks/useUpload'
import electronLogo from '../assets/icon.svg'

export type SidebarView = 'devices' | 'library'

interface SidebarProps {
  currentView: SidebarView
  onSelectView: (v: SidebarView) => void
  onOpenTransfers: () => void
  onOpenSettings: () => void
  onOpenCredits: () => void
  appVersion: string
}

// Meta Business-Manager-style sidebar: brand at the top, vertical nav, then
// a quiet footer with status, theme toggle, version, and credits.
const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onOpenTransfers,
  onOpenSettings,
  onOpenCredits,
  appVersion
}) => {
  const { isConnected, selectedDeviceDetails } = useAdb()
  const { games } = useGames()
  const { serverConfig, colorScheme, setColorScheme } = useSettings()
  const { queue: downloadQueue } = useDownload()
  const { queue: uploadQueue } = useUpload()

  const hasServer = serverConfig?.baseUri?.length > 0
  const totalGames = games.filter((g) => {
    const s = String(g.size ?? '').trim()
    return s !== '0 MB' && s !== ''
  }).length
  const deviceName = selectedDeviceDetails?.friendlyModelName ?? null

  const activeDownloads = downloadQueue.filter((d) =>
    ['Queued', 'Downloading', 'Extracting', 'Installing'].includes(d.status)
  ).length
  const activeUploads = uploadQueue.filter((u) =>
    ['Queued', 'Preparing', 'Uploading'].includes(u.status)
  ).length
  const activeTransfers = activeDownloads + activeUploads

  const NavItem: React.FC<{
    icon: React.ReactNode
    label: string
    active?: boolean
    onClick: () => void
    badge?: number
  }> = ({ icon, label, active, onClick, badge }) => (
    <button
      onClick={onClick}
      className={`quest-sidebar__nav-item${active ? ' is-active' : ''}`}
      type="button"
    >
      <span className="quest-sidebar__nav-icon" aria-hidden>
        {icon}
      </span>
      <span className="quest-sidebar__nav-label">{label}</span>
      {badge != null && badge > 0 && (
        <span className="quest-sidebar__nav-badge">{badge > 99 ? '99+' : badge}</span>
      )}
    </button>
  )

  return (
    <aside className="quest-sidebar">
      {/* Brand */}
      <div className="quest-sidebar__brand">
        <img src={electronLogo} alt="" className="quest-sidebar__brand-mark" />
        <div className="quest-sidebar__brand-text">
          <span className="quest-sidebar__brand-name">Fast Travel</span>
          <span className="quest-sidebar__brand-sub">Sideload manager</span>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="quest-sidebar__nav">
        <NavItem
          icon={<HeadsetVrRegular fontSize={20} />}
          label="Devices"
          active={currentView === 'devices'}
          onClick={() => onSelectView('devices')}
        />
        <NavItem
          icon={<LibraryRegular fontSize={20} />}
          label="Library"
          active={currentView === 'library'}
          onClick={() => onSelectView('library')}
          badge={totalGames > 0 ? undefined : undefined}
        />
      </nav>

      <div className="quest-sidebar__divider" />

      {/* Secondary actions */}
      <nav className="quest-sidebar__nav">
        <NavItem
          icon={<ArrowDownloadRegular fontSize={20} />}
          label="Transfers"
          onClick={onOpenTransfers}
          badge={activeTransfers || undefined}
        />
        <NavItem
          icon={<SettingsRegular fontSize={20} />}
          label="Settings"
          onClick={onOpenSettings}
        />
      </nav>

      {/* Footer block */}
      <div className="quest-sidebar__footer">
        {/* Compact status */}
        <dl className="quest-sidebar__status">
          <div className="quest-sidebar__status-row">
            <dt>Server</dt>
            <dd className={hasServer ? 'is-good' : 'is-warn'}>
              {hasServer ? 'Online' : 'Offline'}
            </dd>
          </div>
          <div className="quest-sidebar__status-row">
            <dt>Device</dt>
            <dd className={isConnected ? 'is-good' : 'is-dim'} title={deviceName ?? undefined}>
              {isConnected && deviceName ? deviceName : 'Not connected'}
            </dd>
          </div>
          <div className="quest-sidebar__status-row">
            <dt>Library</dt>
            <dd>{totalGames ? `${totalGames.toLocaleString()} games` : '—'}</dd>
          </div>
        </dl>

        {/* Theme toggle */}
        <button
          className="quest-sidebar__theme"
          onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
          type="button"
          title={colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {colorScheme === 'dark' ? (
            <WeatherMoonRegular fontSize={16} />
          ) : (
            <WeatherSunnyRegular fontSize={16} />
          )}
          <span>{colorScheme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>

        {/* Credits */}
        <div className="quest-sidebar__credits">
          <span>v{appVersion || '—'} · Made with ♥ by DMP</span>
          <button
            type="button"
            className="quest-sidebar__credits-btn"
            onClick={onOpenCredits}
            aria-label="Credits"
          >
            <QuestionCircleRegular fontSize={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
