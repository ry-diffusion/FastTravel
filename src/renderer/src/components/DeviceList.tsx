import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  HardDrive,
  Headphones,
  Link,
  Loader2,
  RefreshCw,
  Terminal,
  Unplug,
  Usb,
  Wifi
} from 'lucide-react'
import { useAdb } from '../hooks/useAdb'
import { ExtendedDeviceInfo, hasBookmarkData, isWiFiBookmark } from '@shared/types'
import { AdbShellDialog } from './AdbShellDialog'

import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Progress } from '@renderer/components/ui/progress'
import { Separator } from '@renderer/components/ui/separator'

import quest3sImage from '@renderer/assets/images/quest-3s.webp'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DeviceListProps {
  onSkip?: () => void
  onConnected?: () => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Parse a storage string like "49G", "106G", "512M" → number of GB (float). */
function parseStorageGB(raw: string | null | undefined): number | null {
  if (!raw) return null
  const m = raw.match(/^([\d.]+)\s*([GMKT])/i)
  if (!m) return null
  const val = parseFloat(m[1])
  const unit = m[2].toUpperCase()
  if (unit === 'G') return val
  if (unit === 'T') return val * 1024
  if (unit === 'M') return val / 1024
  return val
}

function fmtGB(n: number | null): string {
  if (n === null) return '—'
  return n >= 10 ? `${Math.round(n)} GB` : `${n.toFixed(1)} GB`
}

function pingLabel(ms: number | null | undefined): string {
  if (ms == null) return ''
  if (ms < 20) return `${ms} ms · excellent`
  if (ms < 50) return `${ms} ms · good`
  if (ms < 100) return `${ms} ms · fair`
  return `${ms} ms · poor`
}

function getBatteryIcon(level: number | null): React.ReactElement {
  if (level === null) return <BatteryMedium className="h-5 w-5 text-muted-foreground" aria-hidden />
  if (level >= 60) return <BatteryFull className="h-5 w-5 text-emerald-500" aria-hidden />
  if (level >= 25) return <BatteryMedium className="h-5 w-5 text-amber-500" aria-hidden />
  return <BatteryLow className="h-5 w-5 text-destructive" aria-hidden />
}

type DeviceStatus = 'connected' | 'connecting' | 'error' | 'saved' | 'offline' | 'unauthorized'

function getDeviceStatus(
  device: ExtendedDeviceInfo,
  isConnected: boolean,
  isConnecting: boolean,
  hasError: boolean
): DeviceStatus {
  if (isConnected) return 'connected'
  if (hasError) return 'error'
  if (isConnecting) return 'connecting'
  if (device.type === 'unauthorized') return 'unauthorized'
  if (device.type === 'offline') return 'offline'
  return 'saved'
}

// ─── StatusBadge ───────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: DeviceStatus }> = ({ status }) => {
  if (status === 'connected') {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15"
      >
        Connected
      </Badge>
    )
  }
  if (status === 'connecting') {
    return <Badge variant="default">Connecting</Badge>
  }
  if (status === 'error') {
    return <Badge variant="destructive">Failed</Badge>
  }
  if (status === 'unauthorized') {
    return <Badge variant="destructive">Unauthorized</Badge>
  }
  if (status === 'offline') {
    return <Badge variant="secondary">Offline</Badge>
  }
  // saved / unknown
  return <Badge variant="outline">Saved</Badge>
}

// ─── DeviceAvatar ──────────────────────────────────────────────────────────────

const DeviceAvatar: React.FC<{ device: ExtendedDeviceInfo; size?: 'sm' | 'md' }> = ({
  device,
  size = 'md'
}) => {
  const isWifi = isWiFiBookmark(device) || device.id.includes(':')
  const isQuest = !!device.isQuestDevice
  const cls = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'

  if (isQuest) {
    return (
      <div className={`${cls} flex-shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden`}>
        <img src={quest3sImage} alt="Meta Quest" className="object-contain w-full h-full p-0.5" />
      </div>
    )
  }
  if (isWifi) {
    return (
      <div className={`${cls} flex-shrink-0 rounded-lg bg-primary/10 flex items-center justify-center`}>
        <Wifi className="h-4 w-4 text-primary" aria-hidden />
      </div>
    )
  }
  return (
    <div className={`${cls} flex-shrink-0 rounded-lg bg-muted flex items-center justify-center`}>
      <Usb className="h-4 w-4 text-muted-foreground" aria-hidden />
    </div>
  )
}

// ─── AddByIpForm ───────────────────────────────────────────────────────────────

const AddByIpForm: React.FC<{
  onAdd: (ip: string, port: number) => Promise<void>
  disabled: boolean
}> = ({ onAdd, disabled }) => {
  const [ip, setIp] = useState('')
  const [port, setPort] = useState('5555')
  const [loading, setLoading] = useState(false)

  const handleAdd = async (): Promise<void> => {
    if (!ip.trim()) return
    setLoading(true)
    try {
      await onAdd(ip.trim(), parseInt(port, 10) || 5555)
    } finally {
      setLoading(false)
      setIp('')
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-sm font-medium">IP address</Label>
        <Input
          placeholder="192.168.x.x"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          aria-label="Device IP address"
          disabled={disabled || loading}
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-medium">Port</Label>
        <Input
          placeholder="5555"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          aria-label="Port number"
          disabled={disabled || loading}
          className="font-mono text-sm"
        />
      </div>
      <Button
        className="w-full"
        onClick={handleAdd}
        disabled={!ip.trim() || disabled || loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding…
          </>
        ) : (
          'Add device'
        )}
      </Button>
    </div>
  )
}

// ─── DeviceRow ─────────────────────────────────────────────────────────────────

interface DeviceRowProps {
  device: ExtendedDeviceInfo
  isConnected: boolean
  isConnecting: boolean
  hasError: boolean
  onConnect: () => void
  onDisconnect: () => void
  onDeleteBookmark: () => void
  onOpenShell: () => void
}

const DeviceRow: React.FC<DeviceRowProps> = ({
  device,
  isConnected,
  isConnecting,
  hasError,
  onConnect,
  onDisconnect,
  onDeleteBookmark,
  onOpenShell
}) => {
  const status = getDeviceStatus(device, isConnected, isConnecting, hasError)
  const isWifiBook = isWiFiBookmark(device)
  const isTcp = device.id.includes(':')
  const isConnectable = device.type === 'device' || device.type === 'emulator'
  const isWifi = isWifiBook || (isTcp && isConnectable)

  const label =
    device.friendlyModelName || device.model || (isWifiBook && hasBookmarkData(device) ? device.bookmarkData.name : null) || device.id

  const metaParts: string[] = []
  if (isWifiBook) metaParts.push('Wi-Fi bookmark')
  else if (isWifi) metaParts.push('Wi-Fi')
  else if (!isTcp) metaParts.push('USB')
  if (device.ipAddress) metaParts.push(device.ipAddress)
  if (device.pingStatus === 'reachable' && device.pingResponseTime != null)
    metaParts.push(pingLabel(device.pingResponseTime))
  else if (device.pingStatus === 'unreachable') metaParts.push('Unreachable')
  else if (device.pingStatus === 'checking') metaParts.push('Pinging…')

  return (
    <div
      className={[
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        isConnected
          ? 'border-emerald-500/25 bg-emerald-500/5'
          : hasError
            ? 'border-destructive/25 bg-destructive/5'
            : 'border-border/50 bg-card/50 hover:bg-muted/30'
      ].join(' ')}
    >
      <DeviceAvatar device={device} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{label}</span>
          <StatusBadge status={status} />
        </div>
        {metaParts.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {metaParts.join(' · ')}
          </p>
        )}
        {hasError && (
          <p className="text-xs text-destructive mt-0.5">Connection failed — try again</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isConnected ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={onOpenShell}
              aria-label="Open ADB shell"
            >
              <Terminal className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onDisconnect}
              aria-label="Disconnect"
            >
              <Unplug className="h-3.5 w-3.5 mr-1" />
              Disconnect
            </Button>
          </>
        ) : isConnecting ? (
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            Connecting
          </Button>
        ) : isWifiBook ? (
          <>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={onConnect}
              disabled={device.pingStatus === 'unreachable'}
              aria-label="Connect to saved device"
            >
              <Link className="h-3.5 w-3.5 mr-1" />
              Connect
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={onDeleteBookmark}
              aria-label="Remove bookmark"
            >
              Remove
            </Button>
          </>
        ) : isConnectable ? (
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={onConnect}
            aria-label="Connect to device"
          >
            <Link className="h-3.5 w-3.5 mr-1" />
            Connect
          </Button>
        ) : null}
      </div>
    </div>
  )
}

// ─── ConnectedHero ─────────────────────────────────────────────────────────────

interface ConnectedHeroProps {
  device: ExtendedDeviceInfo
  onOpenShell: () => void
  onDisconnect: () => void
  onSkip?: () => void
}

const ConnectedHero: React.FC<ConnectedHeroProps> = ({
  device,
  onOpenShell,
  onDisconnect,
  onSkip
}) => {
  const isTcp = device.id.includes(':')
  const connectionType = isTcp ? 'Wi-Fi' : 'USB'
  const modelName = device.friendlyModelName || device.model || 'Meta Quest'
  const serial = device.id
  const batteryLevel = device.batteryLevel
  const storageFreeGB = parseStorageGB(device.storageFree)
  const storageTotalGB = parseStorageGB(device.storageTotal)
  const usedGB = storageTotalGB !== null && storageFreeGB !== null ? storageTotalGB - storageFreeGB : null
  const storageUsedPct =
    storageTotalGB && storageTotalGB > 0 && usedGB !== null
      ? Math.round((usedGB / storageTotalGB) * 100)
      : null

  const pingMs = device.pingResponseTime ?? null

  return (
    <div className="relative flex flex-col lg:flex-row items-stretch overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-muted/20 to-card min-h-[280px] lg:min-h-[320px]">
      {/* Quest image panel */}
      <div className="relative flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 lg:w-80 xl:w-96 h-64 lg:h-auto">
        <img
          src={quest3sImage}
          alt="Meta Quest 3S"
          className="h-48 lg:h-64 xl:h-72 w-auto object-contain drop-shadow-2xl select-none"
          draggable={false}
        />
        {/* Connected pill */}
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        </div>
      </div>

      {/* Info panel */}
      <div className="flex flex-1 flex-col justify-between p-6 lg:p-8 gap-6">
        {/* Top: device identity */}
        <div className="space-y-2">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{modelName}</h1>
            <Badge
              variant="outline"
              className="mt-1 flex-shrink-0 border-primary/30 bg-primary/10 text-primary"
            >
              {connectionType === 'Wi-Fi' ? (
                <Wifi className="mr-1 h-3 w-3" aria-hidden />
              ) : (
                <Usb className="mr-1 h-3 w-3" aria-hidden />
              )}
              {connectionType}
            </Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">{serial}</p>
          {device.ipAddress && (
            <p className="font-mono text-xs text-muted-foreground">{device.ipAddress}</p>
          )}
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Battery */}
          <Card className="border-border/50 bg-background/60">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Battery</span>
                {getBatteryIcon(batteryLevel)}
              </div>
              <p className="text-2xl font-semibold tracking-tight">
                {batteryLevel !== null ? `${batteryLevel}%` : '—'}
              </p>
              <Progress
                value={batteryLevel ?? 0}
                className="h-1.5"
                aria-label={`Battery ${batteryLevel ?? 0}%`}
              />
            </CardContent>
          </Card>

          {/* Storage */}
          <Card className="border-border/50 bg-background/60">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Storage</span>
                <HardDrive className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <p className="text-2xl font-semibold tracking-tight">{fmtGB(storageFreeGB)} free</p>
              {storageTotalGB !== null && (
                <>
                  <Progress
                    value={storageUsedPct ?? 0}
                    className="h-1.5"
                    aria-label={`Storage ${storageUsedPct ?? 0}% used`}
                  />
                  <p className="text-xs text-muted-foreground">
                    of {fmtGB(storageTotalGB)} total
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Connection */}
          <Card className="border-border/50 bg-background/60">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Connection</span>
                {connectionType === 'Wi-Fi' ? (
                  <Wifi className="h-5 w-5 text-muted-foreground" aria-hidden />
                ) : (
                  <Usb className="h-5 w-5 text-muted-foreground" aria-hidden />
                )}
              </div>
              <p className="text-sm font-medium">{connectionType}</p>
              {device.ipAddress && (
                <p className="font-mono text-xs text-muted-foreground">{device.ipAddress}</p>
              )}
              {pingMs !== null && connectionType === 'Wi-Fi' && (
                <p className="text-xs text-muted-foreground">{pingLabel(pingMs)}</p>
              )}
              {!device.ipAddress && connectionType === 'USB' && (
                <p className="font-mono text-xs text-muted-foreground truncate">{serial}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onOpenShell} aria-label="Open ADB shell">
            <Terminal className="mr-2 h-4 w-4" aria-hidden />
            Open ADB shell
          </Button>
          <Button variant="outline" onClick={onDisconnect} aria-label="Disconnect device">
            <Unplug className="mr-2 h-4 w-4" aria-hidden />
            Disconnect
          </Button>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Continue offline
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── EmptyHero ─────────────────────────────────────────────────────────────────

const EmptyHero: React.FC<{ onSkip?: () => void }> = ({ onSkip }) => (
  <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 rounded-xl border border-border bg-gradient-to-br from-card via-muted/20 to-card p-8 lg:p-12">
    <img
      src={quest3sImage}
      alt="Meta Quest 3S"
      className="h-48 lg:h-64 xl:h-72 w-auto object-contain select-none opacity-90"
      draggable={false}
    />
    <div className="max-w-sm space-y-4 text-center lg:text-left">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Connect a headset</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Plug a Meta Quest into USB or add one by Wi-Fi to get started. Make sure developer
          mode and ADB over network are enabled in headset settings.
        </p>
      </div>
      {onSkip && (
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          Continue offline
        </Button>
      )}
    </div>
  </div>
)

// ─── DeviceList (main export) ──────────────────────────────────────────────────

const DeviceList: React.FC<DeviceListProps> = ({ onSkip, onConnected }) => {
  const {
    devices,
    selectedDevice,
    selectedDeviceDetails,
    isConnected,
    isLoading,
    error,
    connectToDevice,
    connectTcpDevice,
    disconnectTcpDevice,
    refreshDevices,
    disconnectDevice
  } = useAdb()

  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null)
  const [connectionErrorId, setConnectionErrorId] = useState<string | null>(null)
  const [shellDialogDeviceId, setShellDialogDeviceId] = useState<string | null>(null)

  // Auto-connect: fires only once when a Quest device newly appears
  const hasAutoConnected = useRef(false)

  const handleConnect = useCallback(
    async (serial: string): Promise<void> => {
      setConnectingDeviceId(serial)
      setConnectionErrorId(null)
      try {
        const success = await connectToDevice(serial)
        if (success) {
          onConnected?.()
        } else {
          setConnectionErrorId(serial)
        }
      } catch {
        setConnectionErrorId(serial)
      } finally {
        setConnectingDeviceId(null)
      }
    },
    [connectToDevice, onConnected]
  )

  useEffect(() => {
    if (isConnected || isLoading || hasAutoConnected.current) return
    const q = devices.find(
      (d) => d.isQuestDevice && (d.type === 'device' || d.type === 'emulator')
    )
    if (!q) return
    hasAutoConnected.current = true
    handleConnect(q.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, isConnected, isLoading])

  const handleConnectBookmark = useCallback(
    async (device: ExtendedDeviceInfo): Promise<void> => {
      if (!hasBookmarkData(device)) return
      const { ipAddress, port, id } = device.bookmarkData
      setConnectingDeviceId(device.id)
      setConnectionErrorId(null)
      try {
        const success = await connectTcpDevice(ipAddress, port)
        if (success) {
          await window.api.wifiBookmarks.updateLastConnected(id)
          onConnected?.()
        } else {
          setConnectionErrorId(device.id)
        }
      } catch {
        setConnectionErrorId(device.id)
      } finally {
        setConnectingDeviceId(null)
      }
    },
    [connectTcpDevice, onConnected]
  )

  const handleAddTcp = useCallback(
    async (ip: string, port: number): Promise<void> => {
      await window.api.wifiBookmarks.add(`${ip}:${port}`, ip, port)
      refreshDevices()
    },
    [refreshDevices]
  )

  const handleDeleteBookmark = useCallback(
    async (device: ExtendedDeviceInfo): Promise<void> => {
      if (!hasBookmarkData(device)) return
      await window.api.wifiBookmarks.remove(device.bookmarkData.id)
      refreshDevices()
    },
    [refreshDevices]
  )

  const handleDisconnect = useCallback(
    async (device: ExtendedDeviceInfo): Promise<void> => {
      const isTcp = device.id.includes(':')
      if (isTcp) {
        const [ip, portStr] = device.id.split(':')
        await disconnectTcpDevice(ip, parseInt(portStr, 10) || 5555)
      } else {
        disconnectDevice()
      }
    },
    [disconnectDevice, disconnectTcpDevice]
  )

  // Devices other than the currently connected one
  const otherDevices = useMemo(
    () => (isConnected ? devices.filter((d) => d.id !== selectedDevice) : devices),
    [devices, isConnected, selectedDevice]
  )

  // Which device drives the connected hero
  const heroDevice = isConnected && selectedDeviceDetails ? selectedDeviceDetails : null

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-background">
      {/* ── Top toolbar ── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3 flex-shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshDevices()}
            disabled={isLoading}
            aria-label="Scan for devices"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Scan
          </Button>
          {onSkip && !isConnected && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Continue offline
            </Button>
          )}
          {onSkip && isConnected && (
            <Button size="sm" variant="secondary" onClick={onSkip}>
              Continue
            </Button>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl w-full p-6 space-y-6">
          {/* Error banner */}
          {error && (
            <Card className="border-destructive/30 bg-destructive/10">
              <CardContent className="px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* ── CONNECTED STATE ── */}
          {heroDevice && (
            <>
              {/* Hero band */}
              <ConnectedHero
                device={heroDevice}
                onOpenShell={() => setShellDialogDeviceId(heroDevice.id)}
                onDisconnect={() => handleDisconnect(heroDevice)}
                onSkip={onSkip}
              />

              {/* Other devices + Add by IP side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Other devices */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Other devices</CardTitle>
                    <CardDescription>
                      Detected devices and saved Wi-Fi bookmarks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {otherDevices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                        <Headphones className="h-8 w-8 text-muted-foreground/40" aria-hidden />
                        <p className="text-sm text-muted-foreground">No other devices found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {otherDevices.map((device) => {
                          const isCurrent = selectedDevice === device.id && isConnected
                          const connecting = connectingDeviceId === device.id
                          const hasErr = connectionErrorId === device.id
                          return (
                            <DeviceRow
                              key={device.id}
                              device={device}
                              isConnected={isCurrent}
                              isConnecting={connecting}
                              hasError={hasErr}
                              onConnect={() =>
                                hasBookmarkData(device)
                                  ? handleConnectBookmark(device)
                                  : handleConnect(device.id)
                              }
                              onDisconnect={() => handleDisconnect(device)}
                              onDeleteBookmark={() => handleDeleteBookmark(device)}
                              onOpenShell={() => setShellDialogDeviceId(device.id)}
                            />
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Add by IP */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Add by IP</CardTitle>
                    <CardDescription>
                      Connect over Wi-Fi. Enable developer mode and ADB over network in
                      your headset settings first.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AddByIpForm onAdd={handleAddTcp} disabled={isLoading} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* ── DISCONNECTED STATE ── */}
          {!heroDevice && (
            <>
              {/* Empty hero */}
              <EmptyHero onSkip={onSkip} />

              {/* Two-column grid: Add by IP + Detected devices */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add by IP */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Add by IP</CardTitle>
                    <CardDescription>
                      Connect over Wi-Fi. Enable developer mode and ADB over network in
                      your headset settings first.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AddByIpForm onAdd={handleAddTcp} disabled={isLoading} />
                  </CardContent>
                </Card>

                {/* Detected devices */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Detected devices</CardTitle>
                    <CardDescription>
                      Devices found via USB or saved Wi-Fi bookmarks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading && devices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
                        <p className="text-sm text-muted-foreground">Searching for devices…</p>
                      </div>
                    ) : devices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                        <Headphones className="h-8 w-8 text-muted-foreground/40" aria-hidden />
                        <p className="text-sm font-medium">No devices found</p>
                        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                          Connect a headset over USB or add one by IP address above.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {devices.map((device) => {
                          const isCurrent = selectedDevice === device.id && isConnected
                          const connecting = connectingDeviceId === device.id
                          const hasErr = connectionErrorId === device.id
                          return (
                            <DeviceRow
                              key={device.id}
                              device={device}
                              isConnected={isCurrent}
                              isConnecting={connecting}
                              hasError={hasErr}
                              onConnect={() =>
                                hasBookmarkData(device)
                                  ? handleConnectBookmark(device)
                                  : handleConnect(device.id)
                              }
                              onDisconnect={() => handleDisconnect(device)}
                              onDeleteBookmark={() => handleDeleteBookmark(device)}
                              onOpenShell={() => setShellDialogDeviceId(device.id)}
                            />
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Separator + bottom help text when truly empty */}
              {!isLoading && devices.length === 0 && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground py-2">
                  <Separator className="flex-1" />
                  <span>No headset detected yet — plug in via USB or add by IP above</span>
                  <Separator className="flex-1" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ADB Shell Dialog */}
      {shellDialogDeviceId && (
        <AdbShellDialog
          deviceId={shellDialogDeviceId}
          isOpen={true}
          onDismiss={() => setShellDialogDeviceId(null)}
        />
      )}
    </div>
  )
}

export default DeviceList
