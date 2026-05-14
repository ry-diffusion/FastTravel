import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Spinner,
  cn
} from '@heroui/react'
import { Headphones, Wifi, RefreshCw, Usb } from 'lucide-react'
import { useAdb } from '../hooks/useAdb'
import { ExtendedDeviceInfo, hasBookmarkData, isWiFiBookmark } from '@shared/types'
import { AdbShellDialog } from './AdbShellDialog'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DeviceListProps {
  onSkip?: () => void
  onConnected?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map ping response-time to a short human label */
function pingLabel(ms: number | null | undefined): string {
  if (ms == null) return ''
  if (ms < 20) return `${ms} ms · excellent`
  if (ms < 50) return `${ms} ms · good`
  if (ms < 100) return `${ms} ms · fair`
  return `${ms} ms · poor`
}

// ---------------------------------------------------------------------------
// HeadsetAvatar
// ---------------------------------------------------------------------------
const HeadsetAvatar: React.FC<{ wifi: boolean; isQuestDevice: boolean }> = ({
  wifi,
  isQuestDevice
}) => (
  <Avatar
    size="md"
    radius="lg"
    classNames={{
      base: cn(
        'flex-shrink-0',
        wifi ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
      )
    }}
    fallback={
      wifi ? (
        <Wifi size={18} aria-hidden />
      ) : isQuestDevice ? (
        <Headphones size={18} aria-hidden />
      ) : (
        <Usb size={18} aria-hidden />
      )
    }
    showFallback
  />
)

// ---------------------------------------------------------------------------
// AddTargetForm
// ---------------------------------------------------------------------------
const AddTargetForm: React.FC<{
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
      await onAdd(ip.trim(), parseInt(port) || 5555)
    } finally {
      setLoading(false)
      setIp('')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-default-500 uppercase tracking-wide">Add by IP</p>
      <div className="flex gap-2 items-center">
        <Input
          size="sm"
          placeholder="192.168.x.x"
          value={ip}
          onValueChange={setIp}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          variant="bordered"
          classNames={{ base: 'flex-1 min-w-0' }}
          aria-label="Device IP address"
        />
        <Input
          size="sm"
          placeholder="5555"
          value={port}
          onValueChange={setPort}
          variant="bordered"
          classNames={{ base: 'w-24 flex-shrink-0' }}
          aria-label="Port number"
        />
        <Button
          size="sm"
          color="primary"
          onPress={handleAdd}
          isDisabled={!ip.trim() || disabled}
          isLoading={loading}
          className="flex-shrink-0"
        >
          Add
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DeviceCard
// ---------------------------------------------------------------------------
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
  const pingStatus: 'reachable' | 'unreachable' | 'checking' | undefined = (device as any).pingStatus
  const pingResponseTime: number | undefined = (device as any).pingResponseTime
  const isQuestDevice: boolean = !!(device as any).isQuestDevice

  // Status chip config
  let statusColor: 'success' | 'warning' | 'danger' | 'default' | 'primary' = 'default'
  let statusLabel = 'Available'
  if (isConnected) { statusColor = 'success'; statusLabel = 'Connected' }
  else if (connectionError) { statusColor = 'danger'; statusLabel = 'Failed' }
  else if (isConnecting) { statusColor = 'primary'; statusLabel = 'Connecting' }
  else if (isUnauth) { statusColor = 'warning'; statusLabel = 'Unauthorized' }
  else if (isOffline) { statusColor = 'default'; statusLabel = 'Offline' }
  else if (isWifiBook) { statusColor = 'default'; statusLabel = 'Saved' }

  // Meta tokens separated by ·
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
    metaParts.push(<span key="ping" className="text-danger">Unreachable</span>)
  } else if (isWifi && pingStatus === 'checking') {
    metaParts.push(<span key="ping" className="text-default-400">Pinging…</span>)
  }

  if (isConnectable && !isQuestDevice && !isWifi) {
    metaParts.push(<span key="unknown" className="text-warning">Unknown device</span>)
  }

  const metaRow = metaParts.reduce<React.ReactNode[]>((acc, node, i) => {
    if (i > 0) acc.push(<span key={`sep-${i}`} className="text-default-300 select-none">·</span>)
    acc.push(node)
    return acc
  }, [])

  return (
    <Card
      className={cn(
        'border border-divider transition-colors duration-150',
        isConnected && 'border-success/30 bg-success/5',
        connectionError && 'border-danger/30 bg-danger/5',
        !isConnected && !connectionError && 'bg-content2'
      )}
      shadow="none"
      radius="lg"
    >
      <CardBody className="p-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <HeadsetAvatar wifi={isWifi} isQuestDevice={isQuestDevice} />

          {/* Name + meta — flex-1 */}
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground truncate">{name}</span>
              <Chip
                size="sm"
                color={statusColor}
                variant="flat"
                classNames={{ base: 'h-5 flex-shrink-0', content: 'text-[10px] font-medium px-1.5' }}
              >
                {statusLabel}
              </Chip>
            </div>

            {/* Meta row */}
            {metaRow.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap text-xs text-default-500 mt-0.5">
                {metaRow}
              </div>
            )}

            {/* Error inline */}
            {connectionError && (
              <p className="text-xs text-danger mt-0.5">
                Connection failed — check device and try again
              </p>
            )}
          </div>

          {/* Actions — right side */}
          <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
            {isConnected ? (
              <>
                <Button size="sm" color="primary" onPress={onOpenShell}>
                  Shell
                </Button>
                <Button size="sm" variant="flat" onPress={onDisconnect}>
                  Disconnect
                </Button>
              </>
            ) : isConnecting ? (
              <Button size="sm" isDisabled isLoading variant="flat">
                Connecting
              </Button>
            ) : isWifiBook ? (
              <>
                <Button
                  size="sm"
                  color="primary"
                  onPress={onConnect}
                  isDisabled={pingStatus === 'unreachable'}
                >
                  Connect
                </Button>
                <Button size="sm" variant="flat" color="danger" onPress={onDeleteBookmark}>
                  Remove
                </Button>
              </>
            ) : isConnectable ? (
              <>
                <Button size="sm" color="primary" onPress={onConnect}>
                  Connect
                </Button>
                {ipAddress && !isTcp && !isAlreadyBookmarked && (
                  <Button size="sm" variant="flat" onPress={onBookmark}>
                    Save
                  </Button>
                )}
                {isAlreadyBookmarked && (
                  <span className="text-xs text-default-400 px-1">Saved</span>
                )}
              </>
            ) : (
              <Button size="sm" isDisabled variant="flat">
                Unavailable
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main: DeviceList
// ---------------------------------------------------------------------------
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

  // Auto-connect: when a Quest appears and nothing is connected yet — fires only once
  const hasAutoConnected = useRef(false)
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

  // Collect bookmarked IPs so we can mark "Save" buttons as already saved
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

  const handleConnect = useCallback(
    async (serial: string): Promise<void> => {
      setConnectingDeviceId(serial)
      setConnectionErrorId(null)
      try {
        const success = await connectToDevice(serial)
        if (success) {
          setConnectionErrorId(null)
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
        await disconnectTcpDevice(ip, parseInt(portStr) || 5555)
      } else {
        disconnectDevice()
      }
    },
    [disconnectDevice, disconnectTcpDevice]
  )

  return (
    <div className="flex h-full w-full items-center justify-center p-8 bg-background overflow-auto">
      {/* Main panel */}
      <Card
        className="w-full max-w-xl bg-content1"
        shadow="md"
        radius="lg"
      >
        {/* ── Header ── */}
        <CardHeader className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">Devices</span>
            {isLoading && (
              <Spinner
                size="sm"
                color="primary"
                aria-label="Scanning for devices"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              onPress={() => refreshDevices()}
              isLoading={isLoading}
              startContent={!isLoading ? <RefreshCw size={14} /> : undefined}
            >
              Scan
            </Button>

            {onSkip && !isConnected && (
              <Button size="sm" variant="bordered" onPress={onSkip}>
                Continue offline
              </Button>
            )}
            {onSkip && isConnected && (
              <Button size="sm" color="primary" onPress={onSkip}>
                Continue
              </Button>
            )}
          </div>
        </CardHeader>

        <CardBody className="flex flex-col gap-4 px-5 py-4">
          {/* Error banner */}
          {error && (
            <Card
              className="bg-danger/10 border border-danger/30"
              shadow="none"
              radius="md"
            >
              <CardBody className="px-4 py-3">
                <p className="text-sm text-danger">{error}</p>
              </CardBody>
            </Card>
          )}

          {/* Add-by-IP form */}
          <AddTargetForm onAdd={handleAddTcp} disabled={isLoading} />

          <Divider />

          {/* Device list */}
          <div className="flex flex-col gap-2 min-h-[140px]">
            {/* Loading state (no devices yet) */}
            {!error && isLoading && devices.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Spinner size="md" color="primary" />
                <p className="text-sm text-default-500">Searching for devices…</p>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && devices.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Headphones size={40} className="text-default-300" aria-hidden />
                <p className="text-sm font-medium text-foreground">No devices found</p>
                <p className="text-xs text-default-500 max-w-xs leading-relaxed">
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
              <Divider />
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" aria-hidden />
                <span className="text-xs font-medium text-success">Connected</span>
              </div>
            </>
          )}
        </CardBody>
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
