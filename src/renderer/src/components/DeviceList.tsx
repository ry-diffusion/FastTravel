import React, { useCallback, useEffect, useState } from 'react'
import { useAdb } from '../hooks/useAdb'
import { ExtendedDeviceInfo, hasBookmarkData, isWiFiBookmark } from '@shared/types'
import { AdbShellDialog } from './AdbShellDialog'
import '../assets/device-list-breach.css'

interface DeviceListProps {
  onSkip?: () => void
  onConnected?: () => void
}

// ─── Quest-style scanning indicator ──────────────────────────────────────────
// Replaces the old radar/scanline overlay with a calm pulsing dot used in the
// header while the device scan is active.
const ScanPulse: React.FC<{ scanning: boolean }> = ({ scanning }) => (
  <span
    aria-hidden
    style={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: scanning ? 'var(--vrcd-neon)' : 'rgba(255,255,255,0.18)',
      boxShadow: scanning ? '0 0 0 0 rgba(61,125,255,0.5)' : 'none',
      animation: scanning ? 'questScanPulse 1.8s ease-out infinite' : 'none',
      display: 'inline-block'
    }}
  />
)

// ─── Signal bar widget ────────────────────────────────────────────────────────
const SignalBars: React.FC<{ ms?: number | null }> = ({ ms }) => {
  const strength = ms == null ? 0 : ms < 20 ? 5 : ms < 50 ? 4 : ms < 100 ? 3 : ms < 200 ? 2 : 1
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
      {[1,2,3,4,5].map((bar) => (
        <span key={bar} style={{
          width: '3px',
          height: `${bar * 2 + 4}px`,
          background: bar <= strength ? 'var(--vrcd-neon)' : 'rgba(var(--vrcd-neon-raw),0.15)',
          boxShadow: bar <= strength ? '0 0 4px rgba(var(--vrcd-neon-raw),0.7)' : 'none',
          borderRadius: '1px',
          display: 'inline-block'
        }} />
      ))}
      {ms != null && (
        <span style={{ color: 'rgba(var(--vrcd-neon-raw),0.55)', fontSize: '10px', fontFamily: 'monospace', marginLeft: '4px', lineHeight: 1, alignSelf: 'center' }}>{ms}ms</span>
      )}
    </span>
  )
}

// ─── Device target card ───────────────────────────────────────────────────────
interface TargetCardProps {
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

const TargetCard: React.FC<TargetCardProps> = ({
  device, isConnected, isConnecting, connectionError,
  onConnect, onDisconnect, onBookmark, onDeleteBookmark, onOpenShell,
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
  const statusBadgeColor = isConnected ? 'var(--vrcd-neon)' : connectionError ? '#ff4444' : isConnecting ? 'var(--vrcd-purple)' : isOffline ? '#666' : 'rgba(var(--vrcd-neon-raw),0.4)'
  const statusText = isConnected ? 'Connected' : connectionError ? 'Failed' : isConnecting ? 'Connecting…' : isUnauth ? 'Unauthorized' : isOffline ? 'Offline' : isWifiBook ? 'Saved' : 'Available'

  const S = { fontFamily: 'var(--vrcd-font-mono)' }

  return (
    <div className={isConnected ? 'breach-target-card' : ''} style={{
      background: isConnected
        ? 'linear-gradient(135deg, rgba(var(--vrcd-neon-raw),0.06) 0%, rgba(var(--vrcd-purple-raw),0.04) 100%)'
        : connectionError
        ? 'rgba(255,68,68,0.04)'
        : 'rgba(var(--vrcd-neon-raw),0.025)',
      border: `1px solid ${isConnected ? 'rgba(var(--vrcd-neon-raw),0.5)' : connectionError ? 'rgba(255,68,68,0.4)' : isWifi ? 'rgba(var(--vrcd-purple-raw),0.35)' : 'rgba(var(--vrcd-neon-raw),0.2)'}`,
      borderRadius: '6px',
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '8px',
      transition: 'border-color 0.2s, background 0.2s',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Connecting shimmer */}
      {isConnecting && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'questShimmer 1.6s linear infinite',
          pointerEvents: 'none'
        }} />
      )}

      {/* Left: icon + info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
        {/* Icon block */}
        <div style={{ fontSize: '24px', flexShrink: 0, lineHeight: 1, paddingTop: '2px' }}>
          {isWifi ? '📡' : '🥽'}
        </div>

        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ ...S, color: 'var(--vrcd-neon)', fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.06em', textShadow: isConnected ? '0 0 8px rgba(var(--vrcd-neon-raw),0.6)' : 'none' }}>
              {name.toUpperCase()}
            </span>
            {/* Status badge */}
            <span style={{
              ...S, fontSize: '9px', letterSpacing: '0.14em', padding: '2px 7px',
              border: `1px solid ${statusBadgeColor}`,
              color: statusBadgeColor,
              borderRadius: '3px',
              textShadow: isConnected ? `0 0 6px ${statusBadgeColor}` : 'none',
              boxShadow: isConnected ? `0 0 6px ${statusBadgeColor}40` : 'none',
              flexShrink: 0
            }}>
              {statusText}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {/* Type label */}
            <span style={{ ...S, fontSize: '10px', color: isWifi ? 'rgba(var(--vrcd-purple-raw),0.7)' : 'rgba(var(--vrcd-neon-raw),0.45)', letterSpacing: '0.08em' }}>
              {isWifiBook ? '◈ WiFi Bookmark' : isWifi ? '◈ WiFi Device' : '◈ USB'}
              {!isConnectable && ` · ${device.type.toUpperCase()}`}
            </span>

            {/* IP */}
            {(device as any).ipAddress && (
              <span style={{ ...S, fontSize: '10px', color: 'rgba(var(--vrcd-neon-raw),0.5)', letterSpacing: '0.06em' }}>
                IP: {(device as any).ipAddress}
              </span>
            )}

            {/* Battery */}
            {(device as any).batteryLevel != null && (
              <span style={{ ...S, fontSize: '10px', color: 'rgba(var(--vrcd-neon-raw),0.5)' }}>
                ⚡ {(device as any).batteryLevel}%
              </span>
            )}

            {/* Storage */}
            {(device as any).storageFree && (
              <span style={{ ...S, fontSize: '10px', color: 'rgba(var(--vrcd-neon-raw),0.5)' }}>
                💾 {(device as any).storageFree} free
              </span>
            )}

            {/* Ping / signal */}
            {isWifi && (
              <span>
                {(device as any).pingStatus === 'reachable' && (
                  <SignalBars ms={(device as any).pingResponseTime ?? null} />
                )}
                {(device as any).pingStatus === 'unreachable' && (
                  <span style={{ ...S, fontSize: 11, color: 'var(--quest-error)' }}>Offline</span>
                )}
                {(device as any).pingStatus === 'checking' && (
                  <span style={{ ...S, fontSize: 11, color: 'var(--quest-text-muted)' }}>Pinging…</span>
                )}
              </span>
            )}

            {/* Non-Quest warning */}
            {isConnectable && !(device as any).isQuestDevice && !isWifi && (
              <span style={{ ...S, fontSize: 11, color: 'var(--quest-warn)' }}>Unknown device</span>
            )}
          </div>

          {/* Connection error */}
          {connectionError && (
            <span style={{ ...S, fontSize: '10px', color: '#ff4444', textShadow: '0 0 6px rgba(255,68,68,0.5)' }}>
              ✗ Connection failed — check device
            </span>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
        {isConnected ? (
          <>
            <button className="breach-btn breach-btn-primary" onClick={onOpenShell}>
              Shell
            </button>
            <button className="breach-btn breach-btn-purple" onClick={onDisconnect}>
              Disconnect
            </button>
          </>
        ) : isConnecting ? (
          <button className="breach-btn" disabled>
            Connecting…
          </button>
        ) : isWifiBook ? (
          <>
            <button className="breach-btn breach-btn-primary" onClick={onConnect}
              disabled={(device as any).pingStatus === 'unreachable'}>
              Connect
            </button>
            <button className="breach-btn breach-btn-purple" onClick={onDeleteBookmark}>
              Remove
            </button>
          </>
        ) : isConnectable ? (
          <>
            <button className="breach-btn breach-btn-primary" onClick={onConnect}>
              Connect
            </button>
            {(device as any).ipAddress && !isTcp && !isAlreadyBookmarked && (
              <button className="breach-btn" onClick={onBookmark}>
                Save
              </button>
            )}
            {isAlreadyBookmarked && (
              <span style={{ fontSize: 11, color: 'var(--quest-text-dim)' }}>Saved</span>
            )}
          </>
        ) : (
          <button className="breach-btn" disabled>
            Unavailable
          </button>
        )}
      </div>
    </div>
  )
}

// ─── TCP Add Form ──────────────────────────────────────────────────────────────
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
    try { await onAdd(ip.trim(), parseInt(port) || 5555) }
    finally { setLoading(false); setIp('') }
  }

  const isValidIp = /^[\d.]+$/.test(ip)
  const portColor = 'rgba(var(--vrcd-purple-raw),0.7)'

  return (
    <div style={{ padding: '12px 0 16px', borderBottom: '1px solid rgba(var(--vrcd-neon-raw),0.1)', marginBottom: '12px' }}>
      <div style={{ color: 'var(--quest-text-muted)', marginBottom: '8px', fontSize: 12, fontWeight: 500 }}>
        Add device by IP
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="breach-input"
          placeholder="192.168.x.x"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          style={{
            flex: '1 1 160px',
            minWidth: '120px',
            padding: '7px 10px',
            borderRadius: '4px',
            outline: 'none',
            background: 'rgba(var(--vrcd-neon-raw),0.04)',
            border: `1px solid ${ip && isValidIp ? 'rgba(var(--vrcd-neon-raw),0.6)' : ip ? 'rgba(255,68,68,0.5)' : 'rgba(var(--vrcd-neon-raw),0.3)'}`,
            color: ip && isValidIp ? 'var(--vrcd-neon)' : ip ? '#ff6666' : 'rgba(var(--vrcd-neon-raw),0.6)',
            fontFamily: 'var(--vrcd-font-mono)',
            fontSize: '12px',
            letterSpacing: '0.05em',
            boxShadow: ip && isValidIp ? '0 0 6px rgba(var(--vrcd-neon-raw),0.1)' : 'none'
          }}
        />
        <input
          className="breach-input"
          placeholder="Port"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          style={{
            width: '72px',
            padding: '7px 10px',
            borderRadius: '4px',
            outline: 'none',
            background: 'rgba(var(--vrcd-purple-raw),0.03)',
            border: `1px solid rgba(var(--vrcd-purple-raw),0.35)`,
            color: portColor,
            fontFamily: 'var(--vrcd-font-mono)',
            fontSize: '12px',
            letterSpacing: '0.05em'
          }}
        />
        <button
          className="breach-btn"
          onClick={handleAdd}
          disabled={!ip.trim() || loading || disabled}
          style={{ padding: '7px 14px' }}
        >
          {loading ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ─── Main DeviceList component ─────────────────────────────────────────────────
const DeviceList: React.FC<DeviceListProps> = ({ onSkip, onConnected }) => {
  const {
    devices, selectedDevice, isConnected, isLoading, error,
    connectToDevice, connectTcpDevice, disconnectTcpDevice,
    refreshDevices, disconnectDevice
  } = useAdb()

  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null)
  const [connectionErrorId, setConnectionErrorId] = useState<string | null>(null)
  const [shellDialogDeviceId, setShellDialogDeviceId] = useState<string | null>(null)

  // Auto-connect: when a Quest appears and nothing connected yet
  const hasAutoConnected = React.useRef(false)
  useEffect(() => {
    if (isConnected || isLoading || hasAutoConnected.current) return
    const q = devices.find((d) => (d as any).isQuestDevice && (d.type === 'device' || d.type === 'emulator'))
    if (!q) return
    hasAutoConnected.current = true
    handleConnect(q.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, isConnected, isLoading])

  const bookmarkedIps = React.useMemo(() =>
    devices
      .filter((d) => isWiFiBookmark(d) || hasBookmarkData(d))
      .map((d) => isWiFiBookmark(d) ? (d as any).ipAddress : hasBookmarkData(d) ? d.bookmarkData.ipAddress : null)
      .filter(Boolean) as string[],
  [devices])

  const handleConnect = useCallback(async (serial: string): Promise<void> => {
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
  }, [connectToDevice, onConnected])

  const handleConnectBookmark = useCallback(async (device: ExtendedDeviceInfo): Promise<void> => {
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
  }, [connectTcpDevice, onConnected])

  const handleAddTcp = useCallback(async (ip: string, port: number): Promise<void> => {
    await window.api.wifiBookmarks.add(`${ip}:${port}`, ip, port)
    refreshDevices()
  }, [refreshDevices])

  const handleBookmark = useCallback(async (device: ExtendedDeviceInfo): Promise<void> => {
    const ip = (device as any).ipAddress
    if (!ip) return
    const name = device.friendlyModelName || (device as any).model || device.id
    await window.api.wifiBookmarks.add(`${name} (${ip})`, ip, 5555)
    refreshDevices()
  }, [refreshDevices])

  const handleDeleteBookmark = useCallback(async (device: ExtendedDeviceInfo): Promise<void> => {
    if (!hasBookmarkData(device)) return
    await window.api.wifiBookmarks.remove(device.bookmarkData.id)
    refreshDevices()
  }, [refreshDevices])

  const handleDisconnect = useCallback(async (device: ExtendedDeviceInfo): Promise<void> => {
    const isTcp = device.id.includes(':')
    if (isTcp) {
      const [ip, portStr] = device.id.split(':')
      await disconnectTcpDevice(ip, parseInt(portStr) || 5555)
    } else {
      disconnectDevice()
    }
  }, [disconnectDevice, disconnectTcpDevice])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', width: '100%', padding: '32px',
      background: 'var(--quest-bg)',
      position: 'relative', overflow: 'auto'
    }}>
      {/* Main panel */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: '560px',
        margin: 'auto',
        background: 'var(--quest-bg-raised)',
        border: '1px solid var(--quest-border)',
        borderRadius: 'var(--quest-radius-lg)',
        boxShadow: 'var(--quest-shadow-2)',
        overflow: 'hidden'
      }}>
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--quest-border)',
          background: 'transparent'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ScanPulse scanning={isLoading || connectingDeviceId !== null} />
            <span style={{ color: 'var(--quest-text)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em' }}>
              Devices
            </span>
            {isLoading && (
              <span style={{ fontSize: 12, color: 'var(--quest-text-muted)' }}>
                Searching…
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="breach-btn" onClick={() => refreshDevices()} disabled={isLoading}>
              {isLoading ? 'Scanning…' : 'Scan'}
            </button>
            {onSkip && !isConnected && (
              <button className="breach-btn breach-btn-purple" onClick={onSkip}>
                Continue offline
              </button>
            )}
            {onSkip && isConnected && (
              <button className="breach-btn breach-btn-primary" onClick={onSkip}>
                Continue
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {true && (
          <div style={{ padding: '16px 20px' }}>
            {/* Error banner */}
            {error && (
              <div style={{ fontSize: 13, color: 'var(--quest-error)', padding: '10px 14px',
                background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.32)',
                borderRadius: 'var(--quest-radius-md)', marginBottom: '12px' }}>
                {error}
              </div>
            )}

            {/* Add target form */}
            <AddTargetForm onAdd={handleAddTcp} disabled={isLoading} />

            {/* Device list area */}
            <div style={{ minHeight: '140px' }}>
              {!error && isLoading && devices.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ color: 'var(--quest-text-muted)', fontSize: 14, marginBottom: '4px' }}>
                    Searching for devices…
                  </div>
                </div>
              )}

              {!error && !isLoading && devices.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ color: 'var(--quest-text)', fontSize: 15, fontWeight: 500, marginBottom: '6px' }}>
                    No devices found
                  </div>
                  <div style={{ color: 'var(--quest-text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                    Connect a headset over USB or add one by IP above.<br />
                    Make sure developer mode is enabled on the device.
                  </div>
                </div>
              )}

              {devices.map((device) => {
                const isCurrent = selectedDevice === device.id && isConnected
                const isConnecting = connectingDeviceId === device.id
                const hasError = connectionErrorId === device.id

                return (
                  <TargetCard
                    key={device.id}
                    device={device}
                    isConnected={isCurrent}
                    isConnecting={isConnecting}
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
                    isAlreadyBookmarked={!!(device as any).ipAddress && bookmarkedIps.includes((device as any).ipAddress)}
                  />
                )
              })}
            </div>

            {/* Footer: connected status */}
            {isConnected && (
              <div style={{
                marginTop: '12px', paddingTop: '12px',
                borderTop: '1px solid var(--quest-border)',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--quest-success)', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--quest-text)', fontWeight: 500 }}>
                  Connected
                </span>
              </div>
            )}
          </div>
        )}
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
