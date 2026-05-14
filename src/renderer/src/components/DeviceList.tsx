import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Headphones, Wifi, Usb, RefreshCw, Loader2, Terminal, Unplug, Link } from 'lucide-react'
import { useAdb } from '../hooks/useAdb'
import { ExtendedDeviceInfo, hasBookmarkData, isWiFiBookmark } from '@shared/types'
import { AdbShellDialog } from './AdbShellDialog'

import { Avatar, AvatarFallback } from '@renderer/components/ui/avatar'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Separator } from '@renderer/components/ui/separator'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DeviceListProps {
  onSkip?: () => void
  onConnected?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pingLabel(ms: number | null | undefined): string {
  if (ms == null) return ''
  if (ms < 20) return `${ms} ms · excellent`
  if (ms < 50) return `${ms} ms · good`
  if (ms < 100) return `${ms} ms · fair`
  return `${ms} ms · poor`
}

// ─── HeadsetAvatar ────────────────────────────────────────────────────────────

const HeadsetAvatar: React.FC<{ wifi: boolean; isQuestDevice: boolean }> = ({
  wifi,
  isQuestDevice
}) => (
  <Avatar className="h-10 w-10 flex-shrink-0 rounded-lg">
    <AvatarFallback
      className={
        wifi
          ? 'rounded-lg bg-blue-500/10 text-blue-400'
          : isQuestDevice
            ? 'rounded-lg bg-primary/10 text-primary'
            : 'rounded-lg bg-muted text-muted-foreground'
      }
    >
      {wifi ? (
        <Wifi className="h-4 w-4" aria-hidden />
      ) : isQuestDevice ? (
        <Headphones className="h-4 w-4" aria-hidden />
      ) : (
        <Usb className="h-4 w-4" aria-hidden />
      )}
    </AvatarFallback>
  </Avatar>
)

// ─── StatusBadge ─────────────────────────────────────────────────────────────

type DeviceStatus = 'connected' | 'connecting' | 'error' | 'saved' | 'offline' | 'unauthorized'

const StatusBadge: React.FC<{ status: DeviceStatus }> = ({ status }) => {
  const map: Record<DeviceStatus, { label: string; className: string }> = {
    connected: {
      label: 'Connected',
      className:
        'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/15'
    },
    connecting: {
      label: 'Connecting',
      className:
        'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/15'
    },
    error: {
      label: 'Failed',
      className:
        'bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/15'
    },
    saved: {
      label: 'Saved',
      className: ''
    },
    offline: {
      label: 'Offline',
      className: ''
    },
    unauthorized: {
      label: 'Unauthorized',
      className: ''
    }
  }

  const cfg = map[status]

  if (status === 'saved') {
    return (
      <Badge variant="outline" className="h-5 text-[10px] px-1.5">
        {cfg.label}
      </Badge>
    )
  }
  if (status === 'offline' || status === 'unauthorized') {
    return (
      <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
        {cfg.label}
      </Badge>
    )
  }

  return (
    <Badge className={`h-5 text-[10px] px-1.5 ${cfg.className}`}>
      {cfg.label}
    </Badge>
  )
}

// ─── AddByIpForm ─────────────────────────────────────────────────────────────

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
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Add by IP</Label>
      <div className="flex gap-2 items-center">
        <Input
          className="flex-1 h-8 text-sm"
          placeholder="192.168.x.x"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          aria-label="Device IP address"
          disabled={disabled || loading}
        />
        <Input
          className="w-20 h-8 text-sm"
          placeholder="5555"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          aria-label="Port number"
          disabled={disabled || loading}
        />
        <Button
          size="sm"
          className="h-8 flex-shrink-0"
          onClick={handleAdd}
          disabled={!ip.trim() || disabled || loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
        </Button>
      </div>
    </div>
  )
}

// ─── DeviceCard ───────────────────────────────────────────────────────────────

interface DeviceCardProps {
  device: ExtendedDeviceInfo
  isConnected: boolean
  isConnecting: boolean
  connectionError: boolean
  onConnect: () => void
  onDisconnect: () => void
  onBookmark: () => void
  onDeleteBookmark: () => void
  onOpenShell: () => void
  isAlreadyBookmarked: boolean
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isConnected,
  isConnecting,
  connectionError,
  onConnect,
  onDisconnect,
  onBookmark,
  onDeleteBookmark,
  onOpenShell,
  isAlreadyBookmarked
}) => {
  const isWifiBook = isWiFiBookmark(device)
  const hasBook = hasBookmarkData(device)
  const isTcp = device.id.includes(':')
  const isConnectable = device.type === 'device' || device.type === 'emulator'
  const isOffline = device.type === 'offline'
  const isUnauth = device.type === 'unauthorized'
  const isWifi = isWifiBook || (hasBook && isTcp && isConnectable)

  const name = device.friendlyModelName || (device as any).model || device.id
  const ipAddress: string | undefined = (device as any).ipAddress
  const batteryLevel: number | null | undefined = (device as any).batteryLevel
  const storageFree: string | undefined = (device as any).storageFree
  const pingStatus: string | undefined = (device as any).pingStatus
  const pingResponseTime: number | undefined = (device as any).pingResponseTime
  const isQuestDevice: boolean = !!(device as any).isQuestDevice

  // Status
  let status: DeviceStatus = 'saved'
  if (isConnected) status = 'connected'
  else if (connectionError) status = 'error'
  else if (isConnecting) status = 'connecting'
  else if (isUnauth) status = 'unauthorized'
  else if (isOffline) status = 'offline'
  else if (isWifiBook) status = 'saved'
  else if (isConnectable) status = 'saved'

  // Meta row tokens
  const metaParts: React.ReactNode[] = []

  if (isWifiBook) {
    metaParts.push(<span key="conn-type">Wi-Fi bookmark</span>)
  } else if (isWifi) {
    metaParts.push(<span key="conn-type">Wi-Fi</span>)
  } else if (!isTcp) {
    metaParts.push(<span key="conn-type">USB</span>)
  }

  if (ipAddress) {
    metaParts.push(<span key="ip">{ipAddress}</span>)
  }

  if (batteryLevel != null) {
    metaParts.push(<span key="bat">Battery {batteryLevel}%</span>)
  }

  if (storageFree) {
    metaParts.push(<span key="storage">{storageFree} free</span>)
  }

  if (isWifi && pingStatus === 'reachable' && pingResponseTime != null) {
    metaParts.push(<span key="ping">{pingLabel(pingResponseTime)}</span>)
  } else if (isWifi && pingStatus === 'unreachable') {
    metaParts.push(
      <span key="ping" className="text-destructive">
        Unreachable
      </span>
    )
  } else if (isWifi && pingStatus === 'checking') {
    metaParts.push(
      <span key="ping" className="text-muted-foreground/60">
        Pinging…
      </span>
    )
  }

  if (isConnectable && !isQuestDevice && !isWifi) {
    metaParts.push(
      <span key="unknown" className="text-amber-500">
        Unknown device
      </span>
    )
  }

  const metaRow = metaParts.reduce<React.ReactNode[]>((acc, node, i) => {
    if (i > 0) {
      acc.push(
        <span key={`sep-${i}`} className="text-muted-foreground/40 select-none">
          ·
        </span>
      )
    }
    acc.push(node)
    return acc
  }, [])

  return (
    <Card
      className={[
        'bg-muted/30 border transition-colors duration-150',
        isConnected && 'border-emerald-500/30 bg-emerald-500/5',
        connectionError && 'border-destructive/30 bg-destructive/5',
        !isConnected && !connectionError && 'border-border/60'
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <HeadsetAvatar wifi={isWifi} isQuestDevice={isQuestDevice} />

          {/* Name + meta — flex-1 */}
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground truncate">{name}</span>
              <StatusBadge status={status} />
            </div>

            {metaRow.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground mt-0.5">
                {metaRow}
              </div>
            )}

            {connectionError && (
              <p className="text-xs text-destructive mt-0.5">
                Connection failed — check device and try again
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
            {isConnected ? (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={onOpenShell}
                  aria-label="Open ADB shell"
                >
                  <Terminal className="h-3.5 w-3.5" aria-hidden />
                  Shell
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  onClick={onDisconnect}
                  aria-label="Disconnect device"
                >
                  <Unplug className="h-3.5 w-3.5" aria-hidden />
                  Disconnect
                </Button>
              </>
            ) : isConnecting ? (
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden />
                Connecting
              </Button>
            ) : isWifiBook ? (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={onConnect}
                  disabled={pingStatus === 'unreachable'}
                  aria-label="Connect to saved device"
                >
                  <Link className="h-3.5 w-3.5" aria-hidden />
                  Connect
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={onDeleteBookmark}
                  aria-label="Remove bookmark"
                >
                  Remove
                </Button>
              </>
            ) : isConnectable ? (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={onConnect}
                  aria-label="Connect to device"
                >
                  <Link className="h-3.5 w-3.5" aria-hidden />
                  Connect
                </Button>
                {!isAlreadyBookmarked && ipAddress && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={onBookmark}
                    aria-label="Save as Wi-Fi bookmark"
                  >
                    Save
                  </Button>
                )}
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── DeviceList ───────────────────────────────────────────────────────────────

const DeviceList: React.FC<DeviceListProps> = ({ onSkip, onConnected }) => {
  const {
    devices,
    selectedDevice,
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

  // Auto-connect: when a Quest device appears and nothing is connected yet — fires only once
  const hasAutoConnected = useRef(false)

  const handleConnect = useCallback(
    async (serial: string): Promise<void> => {
      setConnectingDeviceId(serial)
      setConnectionErrorId(null)
      try {
        const success = await connectToDevice(serial)
        if (success) {
          if (onConnected) onConnected()
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
      (d) => (d as any).isQuestDevice && (d.type === 'device' || d.type === 'emulator')
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
          if (onConnected) onConnected()
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

  const handleBookmark = useCallback(
    async (device: ExtendedDeviceInfo): Promise<void> => {
      const ip = (device as any).ipAddress
      if (!ip) return
      const name = device.friendlyModelName || (device as any).model || device.id
      await window.api.wifiBookmarks.add(`${name} (${ip})`, ip, 5555)
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

  // Collect bookmarked IPs to avoid duplicate Save buttons
  const bookmarkedIps = React.useMemo(
    () =>
      devices
        .filter((d) => isWiFiBookmark(d) || hasBookmarkData(d))
        .map((d) =>
          isWiFiBookmark(d)
            ? (d as any).ipAddress
            : hasBookmarkData(d)
              ? d.bookmarkData.ipAddress
              : null
        )
        .filter(Boolean) as string[],
    [devices]
  )

  return (
    <div className="flex h-full w-full items-center justify-center p-8 overflow-auto">
      <Card className="w-full max-w-2xl">
        {/* ── Header ── */}
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">Devices</CardTitle>
            {isLoading && (
              <Loader2
                className="h-4 w-4 animate-spin text-muted-foreground"
                aria-label="Scanning for devices"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refreshDevices()}
              disabled={isLoading}
              aria-label="Scan for devices"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
              Scan
            </Button>

            {onSkip && !isConnected && (
              <Button size="sm" variant="secondary" onClick={onSkip}>
                Continue offline
              </Button>
            )}
            {onSkip && isConnected && (
              <Button size="sm" onClick={onSkip}>
                Continue
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error banner */}
          {error && (
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Add by IP */}
          <AddByIpForm onAdd={handleAddTcp} disabled={isLoading} />

          <Separator />

          {/* Device list */}
          <div className="space-y-2 min-h-[140px]">
            {/* Loading / empty states */}
            {!error && isLoading && devices.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">Searching for devices…</p>
              </div>
            )}

            {!isLoading && devices.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Headphones
                  className="h-10 w-10 text-muted-foreground/40"
                  aria-hidden
                />
                <p className="text-sm font-medium text-foreground">No devices found</p>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Connect a headset over USB or add one by IP above.
                </p>
              </div>
            )}

            {/* Device cards */}
            {devices.map((device) => {
              const isCurrent = selectedDevice === device.id && isConnected
              const connecting = connectingDeviceId === device.id
              const hasError = connectionErrorId === device.id

              return (
                <DeviceCard
                  key={device.id}
                  device={device}
                  isConnected={isCurrent}
                  isConnecting={connecting}
                  connectionError={hasError}
                  onConnect={() => {
                    if (hasBookmarkData(device)) {
                      handleConnectBookmark(device)
                    } else {
                      handleConnect(device.id)
                    }
                  }}
                  onDisconnect={() => handleDisconnect(device)}
                  onBookmark={() => handleBookmark(device)}
                  onDeleteBookmark={() => handleDeleteBookmark(device)}
                  onOpenShell={() => setShellDialogDeviceId(device.id)}
                  isAlreadyBookmarked={
                    !!(device as any).ipAddress &&
                    bookmarkedIps.includes((device as any).ipAddress)
                  }
                />
              )
            })}
          </div>

          {/* Connected footer */}
          {isConnected && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0"
                  aria-hidden
                />
                <span className="text-xs font-medium text-emerald-500">Connected</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ADB Shell Dialog — controlled by shellDialogDeviceId state */}
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
