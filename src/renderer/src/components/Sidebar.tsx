import React, { useMemo } from 'react'
import {
  Headphones,
  LibraryBig,
  ArrowDownToLine,
  Settings,
  Sun,
  Moon,
  HelpCircle
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { Separator } from '@renderer/components/ui/separator'
import { Switch } from '@renderer/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useAdb } from '@renderer/hooks/useAdb'
import { useGames } from '@renderer/hooks/useGames'
import { useSettings } from '@renderer/hooks/useSettings'
import { useDownload } from '@renderer/hooks/useDownload'
import { useUpload } from '@renderer/hooks/useUpload'

export type SidebarView = 'devices' | 'library' | 'transfers' | 'settings'

export interface SidebarProps {
  currentView: SidebarView
  onSelectView: (v: SidebarView) => void
  onOpenCredits: () => void
  appVersion: string
}

const ACTIVE_DOWNLOAD_STATUSES = ['Queued', 'Downloading', 'Extracting', 'Installing']
const ACTIVE_UPLOAD_STATUSES = ['Queued', 'Preparing', 'Uploading']

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onOpenCredits,
  appVersion
}) => {
  const { isConnected, selectedDeviceDetails } = useAdb()
  const { games } = useGames()
  const { colorScheme, setColorScheme, serverConfig } = useSettings()
  const { queue: downloadQueue } = useDownload()
  const { queue: uploadQueue } = useUpload()

  const activeTransferCount = useMemo(() => {
    const dl = downloadQueue.filter((d) => ACTIVE_DOWNLOAD_STATUSES.includes(d.status)).length
    const ul = uploadQueue.filter((u) => ACTIVE_UPLOAD_STATUSES.includes(u.status)).length
    return dl + ul
  }, [downloadQueue, uploadQueue])

  const isDark = colorScheme === 'dark'

  // Server online = baseUri is set and non-empty
  const serverOnline = Boolean(serverConfig?.baseUri)

  const deviceLabel = useMemo(() => {
    if (!isConnected || !selectedDeviceDetails) return null
    return (
      selectedDeviceDetails.friendlyModelName ||
      selectedDeviceDetails.model ||
      selectedDeviceDetails.id ||
      'Headset'
    )
  }, [isConnected, selectedDeviceDetails])

  const navItem = (
    view: SidebarView,
    label: string,
    Icon: React.FC<{ className?: string }>,
    badge?: number
  ): React.ReactElement => {
    const active = currentView === view
    return (
      <Button
        key={view}
        variant={active ? 'secondary' : 'ghost'}
        className="w-full justify-start gap-2.5 px-3 text-sm font-normal"
        onClick={() => onSelectView(view)}
        aria-current={active ? 'page' : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {badge != null && badge > 0 && (
          <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
            {badge > 99 ? '99+' : badge}
          </Badge>
        )}
      </Button>
    )
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-card">
      {/* Brand block */}
      <div className="flex items-center gap-3 px-4 py-5">
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarImage src="../assets/icon.svg" alt="Fast Travel" />
          <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
            FT
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight tracking-tight">Fast Travel</p>
          <p className="text-xs text-muted-foreground">Sideload manager</p>
        </div>
      </div>

      <Separator />

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5 p-2" aria-label="Primary">
        {navItem('devices', 'Devices', Headphones)}
        {navItem('library', 'Library', LibraryBig)}
      </nav>

      <Separator className="my-1" />

      {/* Secondary nav */}
      <nav className="flex flex-col gap-0.5 p-2" aria-label="Secondary">
        {navItem('transfers', 'Transfers', ArrowDownToLine, activeTransferCount)}
        {navItem('settings', 'Settings', Settings)}
      </nav>

      {/* Footer — pinned to bottom */}
      <div className="mt-auto border-t border-border px-3 pt-3 pb-3 space-y-3">
        {/* Status rows */}
        <dl className="space-y-1.5 text-xs">
          {/* Server */}
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Server</dt>
            <dd className={serverOnline ? 'text-emerald-500' : 'text-amber-500'}>
              {serverOnline ? 'Online' : 'Offline'}
            </dd>
          </div>

          {/* Device */}
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Device</dt>
            <dd
              className={
                isConnected && deviceLabel ? 'text-emerald-500' : 'text-muted-foreground'
              }
            >
              {isConnected && deviceLabel ? deviceLabel : 'Not connected'}
            </dd>
          </div>

          {/* Library */}
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Library</dt>
            <dd className="text-foreground">
              {games.length} {games.length === 1 ? 'game' : 'games'}
            </dd>
          </div>
        </dl>

        {/* Theme toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            <span>{isDark ? 'Dark' : 'Light'}</span>
          </div>
          <Switch
            checked={isDark}
            onCheckedChange={(checked) => setColorScheme(checked ? 'dark' : 'light')}
            aria-label="Toggle dark mode"
          />
        </div>

        {/* Version + credits */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs text-muted-foreground truncate">
            v{appVersion} · Made with ♥ by DMP
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={onOpenCredits}
                aria-label="Open credits"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Credits</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
