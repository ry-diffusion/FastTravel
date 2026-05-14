import React, { useCallback, useEffect, useState } from 'react'
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

/** Headset avatar: monochrome letter avatar using Quest blue */
const HeadsetAvatar: React.FC<{ wifi: boolean }> = ({ wifi }) => (
  <Avatar
    size="md"
    radius="lg"
    classNames={{
      base: cn(
        'bg-primary/10 text-primary flex-shrink-0',
        wifi ? 'bg-secondary/10 text-secondary' : ''
      )
    }}
    fallback={
      <span className="text-lg select-none" aria-hidden>
        {wifi ? '📡' : '🥽'}
      </span>
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
      <p className="text-xs font-medium text-default-400 uppercase tracking-wide">Add by IP</p>
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
          placeholder="Port"
          value={port}
          onValueChange={setPort}
          variant="bordered"
          classNames={{ base: 'w-20 flex-shrink-0' }}
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
  const batteryLevel: number | undefined = (device as any).batteryLevel
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

  // Meta tokens — small text-default-500 row
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
    metaParts.push(<span key="ping" className="text-danger-400">Unreachable</span>)
  } else if (isWifi && pingStatus === 'checking') {
    metaParts.push(<span key="ping" className="text-default-400">Pinging…</span>)
  }

  if (isConnectable && !isQuestDevice && !isWifi) {
    metaParts.push(<span key="unknown" className="text-warning-400">Unknown device</span>)
  }

  const metaRow = metaParts.reduce<React.ReactNode[]>((acc, node, i) => {
    if (i > 0) acc.push(<span key={`sep-${i}`} className="opacity-30">·</span>)
    acc.push(node)
    return acc
  }, [])

  return (
    <Card
      className={cn(
        'border border-divider bg-content2 transition-colors duration-150',
        isConnected && 'border-success/30 bg-success/5',
        connectionError && 'border-danger/30 bg-danger/5'
      )}
      shadow="none"
      radius="lg"
    >
      <CardBody className="p-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <HeadsetAvatar wifi={isWifi} />

          {/* Name + meta — flex-1 */}
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{name}</span>
              <Chip
                size="sm"
                color={statusColor}
                variant="flat"
                classNames={{ base: 'h-5 flex-shrink-0', content: 'text-[10px] font-medium px-1.5' }}
              >
                {statusLabel}
              </Chip>
            </div>

            {/* Type chips */}
            <div className="flex items-center gap-1 flex-wrap">
              {isQuestDevice && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="primary"
                  classNames={{ base: 'h-4 flex-shrink-0', content: 'text-[9px] px-1' }}
                >
                  Quest device
                </Chip>
              )}
              {isWifiBook && (
                <Chip
                  size="sm"
                  variant="flat"
                  classNames={{ base: 'h-4 flex-shrink-0', content: 'text-[9px] px-1' }}
                >
                  Wi-Fi bookmark
                </Chip>
              )}
            </div>

            {/* Meta row */}
            {metaRow.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap text-[11px] text-default-500 mt-0.5">
                {metaRow}
              </div>
            )}

            {/* Error inline */}
            {connectionError && (
              <p className="text-[11px] text-danger mt-0.5">
                Connection failed — check device and try again
              </p>
            )}
          </div>

          {/* Actions — right side */}
          <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
            {isConnected ? (
              <>
                <Button size="sm" color="primary" variant="solid" onPress={onOpenShell}>
                  Shell
                </Button>
                <Button size="sm" variant="light" color="default" onPress={onDisconnect}>
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
                  variant="solid"
                  onPress={onConnect}
                  isDisabled={pingStatus === 'unreachable'}
                >
                  Connect
                </Button>
                <Button size="sm" variant="light" color="danger" onPress={onDeleteBookmark}>
                  Remove
                </Button>
              </>
            ) : isConnectable ? (
              <>
                <Button size="sm" color="primary" variant="solid" onPress={onConnect}>
                  Connect
                </Button>
                {ipAddress && !isTcp && !isAlreadyBookmarked && (
                  <Button size="sm" variant="light" color="default" onPress={onBookmark}>
                    Save
                  </Button>
                )}
                {isAlreadyBookmarked && (
                  <span className="text-[11px] text-default-400 px-1">Saved</span>
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

  // Auto-connect: when a Quest appears and nothing is connected yet
  const hasAutoConnected = React.useRef(false)
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

  const isScanning = isLoading || connectingDeviceId !== null

  return (
    <div className="flex h-full w-full items-center justify-center p-8 overflow-auto">
      {/* Main panel */}
      <Card
        className="w-full max-w-[560px] border border-divider bg-content1"
        shadow="sm"
        radius="lg"
      >
        {/* ── Header ── */}
        <CardHeader className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">Devices</span>
            {isScanning && (
              <Spinner
                size="sm"
                color="primary"
                classNames={{ base: 'w-4 h-4' }}
                aria-label="Scanning for devices"
              />
            )}
            {isLoading && (
              <span className="text-xs text-default-400">Searching…</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              color="default"
              onPress={() => refreshDevices()}
              isDisabled={isLoading}
            >
              {isLoading ? 'Scanning…' : 'Scan'}
            </Button>

            {onSkip && !isConnected && (
              <Button size="sm" variant="light" color="default" onPress={onSkip}>
                Continue offline
              </Button>
            )}
            {onSkip && isConnected && (
              <Button size="sm" color="primary" variant="solid" onPress={onSkip}>
                Continue
              </Button>
            )}
          </div>
        </CardHeader>

        <Divider />

        <CardBody className="flex flex-col gap-4 px-5 py-4">
          {/* Error banner */}
          {error && (
            <Card
              className="border border-danger/40 bg-danger-50/20"
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
            {!error && !isLoading && devices.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No devices found</p>
                <p className="text-xs text-default-500 max-w-[320px] leading-relaxed">
                  Connect a headset over USB or add one by IP above. Make sure developer mode is
                  enabled on the device.
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
                <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
                <span className="text-xs font-medium text-default-600">
                  Device connected
                </span>
              </div>
            </>
          )}
        </CardBody>
      </Card>

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
