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
import { Avatar, Chip, Divider, Switch, Tooltip } from '@heroui/react'
import { useAdb } from '../hooks/useAdb'
import { useGames } from '../hooks/useGames'
import { useSettings } from '../hooks/useSettings'
import { useDownload } from '../hooks/useDownload'
import { useUpload } from '@renderer/hooks/useUpload'
import electronLogo from '../assets/icon.svg'

export type SidebarView = 'devices' | 'library' | 'transfers' | 'settings'

interface SidebarProps {
  currentView: SidebarView
  onSelectView: (v: SidebarView) => void
  onOpenCredits: () => void
  appVersion: string
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
  badge?: number
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    type="button"
    className={[
      'flex items-center gap-3 w-full px-3 py-2 rounded-large text-small font-medium',
      'transition-colors duration-100 cursor-pointer border-none outline-none',
      active
        ? 'bg-primary/15 text-primary'
        : 'bg-transparent text-default-500 hover:bg-content3 hover:text-foreground'
    ].join(' ')}
    aria-current={active ? 'page' : undefined}
  >
    <span
      className={[
        'inline-flex items-center justify-center w-5 h-5 shrink-0',
        active ? 'text-primary' : 'text-default-400'
      ].join(' ')}
      aria-hidden
    >
      {icon}
    </span>
    <span className="flex-1 min-w-0 text-left truncate">{label}</span>
    {badge != null && badge > 0 && (
      <Chip size="sm" color="primary" variant="solid" className="h-4 min-w-4 px-1 text-tiny">
        {badge > 99 ? '99+' : badge}
      </Chip>
    )}
  </button>
)

interface StatusRowProps {
  label: string
  value: string
  variant?: 'good' | 'warn' | 'dim' | 'default'
  title?: string
}

const StatusRow: React.FC<StatusRowProps> = ({ label, value, variant = 'default', title }) => {
  const valueClass =
    variant === 'good'
      ? 'text-success'
      : variant === 'warn'
        ? 'text-warning'
        : variant === 'dim'
          ? 'text-default-400'
          : 'text-default-600'

  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-tiny text-default-400 font-medium shrink-0">{label}</span>
      <span
        className={`text-tiny font-medium truncate max-w-[136px] ${valueClass}`}
        title={title}
      >
        {value}
      </span>
    </div>
  )
}

// Meta Business-Manager / Horizon OS-style sidebar.
const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
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

  const isDark = colorScheme === 'dark'

  return (
    <aside className="w-64 min-w-[256px] h-screen flex flex-col bg-content1 border-r border-divider px-3 py-3 gap-1 shrink-0">
      {/* Brand block */}
      <div className="flex items-center gap-3 px-2 py-3 mb-1">
        <Avatar
          src={electronLogo}
          size="sm"
          radius="md"
          className="shrink-0"
          alt="Fast Travel"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-small font-bold text-foreground leading-tight tracking-tight">
            Fast Travel
          </span>
          <span className="text-tiny text-default-400 leading-tight">Sideload manager</span>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5">
        <NavItem
          icon={<HeadsetVrRegular fontSize={18} />}
          label="Devices"
          active={currentView === 'devices'}
          onClick={() => onSelectView('devices')}
        />
        <NavItem
          icon={<LibraryRegular fontSize={18} />}
          label="Library"
          active={currentView === 'library'}
          onClick={() => onSelectView('library')}
        />
      </nav>

      <Divider className="my-2" />

      {/* Secondary nav */}
      <nav className="flex flex-col gap-0.5">
        <NavItem
          icon={<ArrowDownloadRegular fontSize={18} />}
          label="Transfers"
          active={currentView === 'transfers'}
          onClick={() => onSelectView('transfers')}
          badge={activeTransfers || undefined}
        />
        <NavItem
          icon={<SettingsRegular fontSize={18} />}
          label="Settings"
          active={currentView === 'settings'}
          onClick={() => onSelectView('settings')}
        />
      </nav>

      {/* Footer — push to bottom */}
      <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-divider">
        {/* Status rows */}
        <div className="flex flex-col gap-1 px-2 py-1">
          <StatusRow
            label="Server"
            value={hasServer ? 'Online' : 'Offline'}
            variant={hasServer ? 'good' : 'warn'}
          />
          <StatusRow
            label="Device"
            value={isConnected && deviceName ? deviceName : 'Not connected'}
            variant={isConnected ? 'good' : 'dim'}
            title={deviceName ?? undefined}
          />
          <StatusRow
            label="Library"
            value={totalGames ? `${totalGames.toLocaleString()} games` : '—'}
          />
        </div>

        {/* Theme toggle */}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-tiny text-default-500 font-medium">
            {isDark ? 'Dark mode' : 'Light mode'}
          </span>
          <Switch
            size="md"
            color="primary"
            isSelected={isDark}
            onValueChange={(val) => setColorScheme(val ? 'dark' : 'light')}
            startContent={<WeatherMoonRegular fontSize={12} />}
            endContent={<WeatherSunnyRegular fontSize={12} />}
            classNames={{
              wrapper: 'bg-default-200 group-data-[selected=true]:bg-primary'
            }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          />
        </div>

        {/* Version + credits */}
        <div className="flex items-center justify-between px-2 pb-1 gap-2">
          <span className="text-tiny text-default-400">
            v{appVersion || '—'} · Made with ♥ by DMP
          </span>
          <Tooltip content="Credits" placement="top" size="sm">
            <button
              type="button"
              onClick={onOpenCredits}
              aria-label="Credits"
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-default-400 hover:text-default-600 hover:bg-content3 transition-colors duration-100 border-none bg-transparent cursor-pointer"
            >
              <QuestionCircleRegular fontSize={14} />
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
