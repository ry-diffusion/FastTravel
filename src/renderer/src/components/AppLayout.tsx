import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AdbProvider } from '../context/AdbProvider'
import { GamesProvider } from '../context/GamesProvider'
import DeviceList from './DeviceList'
import GamesView from './GamesView'
import DownloadsView from './DownloadsView'
import UploadsView from './UploadsView'
import Settings from './Settings'
import { UpdateNotification } from './UpdateNotification'
import UploadGamesDialog from './UploadGamesDialog'
import {
  FluentProvider,
  makeStyles,
  tokens,
  Text,
  teamsDarkTheme,
  teamsLightTheme,
  Button,
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  TabList,
  Tab,
  CounterBadge
} from '@fluentui/react-components'
import QuestLoader from './QuestLoader'
import Sidebar from './Sidebar'
import { useDependency } from '../hooks/useDependency'
import { DependencyProvider } from '../context/DependencyProvider'
import { DownloadProvider } from '../context/DownloadProvider'
import { SettingsProvider } from '../context/SettingsProvider'
import { useDownload } from '../hooks/useDownload'
import {
  ArrowDownloadRegular as DownloadIcon,
  DismissRegular as CloseIcon,
  ArrowUploadRegular as UploadIcon
} from '@fluentui/react-icons'
import { UploadProvider } from '@renderer/context/UploadProvider'
import { useUpload } from '@renderer/hooks/useUpload'
import { GameDialogProvider } from '@renderer/context/GameDialogProvider'
import { useSettings } from '@renderer/hooks/useSettings'
import { LanguageProvider } from '@renderer/context/LanguageProvider'
import { useLanguage } from '@renderer/hooks/useLanguage'
import CreditsDialog from './CreditsDialog'
import TransferStrip from './TransferStrip'
import { ErrorBoundary } from './ErrorBoundary'
import { playSound } from '../hooks/useSoundEffects'
import '../assets/credits-dialog.css'

enum AppView {
  DEVICE_LIST,
  GAMES
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    overflow: 'hidden'
  },
  quest_main: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  transferStrip: {
    minHeight: '0px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    background: 'transparent',
    overflow: 'hidden'
  },
  mainContent: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative'
  },
  loadingOrErrorContainer: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalL
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM
  },
  tabs: {
    marginLeft: tokens.spacingHorizontalM,
    marginRight: tokens.spacingHorizontalM
  }
})

interface MainContentProps {
  currentView: AppView
  onDeviceConnected: () => void
  onSkipConnection: () => void
  onBackToDeviceList: () => void
  onTransfers: () => void
  onSettings: () => void
}

const MainContent: React.FC<MainContentProps> = ({
  currentView,
  onDeviceConnected,
  onSkipConnection,
  onBackToDeviceList,
  onTransfers,
  onSettings
}) => {
  const styles = useStyles()
  const {
    isReady: dependenciesReady,
    error: dependencyError,
    progress: dependencyProgress,
    status: dependencyStatus
  } = useDependency()

  const renderCurrentView = (): React.ReactNode => {
    if (currentView === AppView.DEVICE_LIST) {
      return <DeviceList onConnected={onDeviceConnected} onSkip={onSkipConnection} />
    }
    return <GamesView onBackToDevices={onBackToDeviceList} onTransfers={onTransfers} onSettings={onSettings} />
  }

  if (!dependenciesReady) {
    if (dependencyError) {
      // Check if this is a connectivity error
      if (dependencyError.startsWith('CONNECTIVITY_ERROR|')) {
        const failedUrls = dependencyError.replace('CONNECTIVITY_ERROR|', '').split('|')

        return (
          <div className={styles.loadingOrErrorContainer}>
            <Text weight="semibold" style={{ color: tokens.colorPaletteRedForeground1 }}>
              Network Connectivity Issues
            </Text>
            <Text>Cannot reach the following services:</Text>
            <ul style={{ textAlign: 'left', marginTop: tokens.spacingVerticalS }}>
              {failedUrls.map((url, index) => (
                <li key={index} style={{ marginBottom: tokens.spacingVerticalXS }}>
                  <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{url}</Text>
                </li>
              ))}
            </ul>
            <Text style={{ marginTop: tokens.spacingVerticalM }}>
              This is likely due to DNS or firewall restrictions. Please try:
            </Text>
            <ol style={{ textAlign: 'left', marginTop: tokens.spacingVerticalS }}>
              <li style={{ marginBottom: tokens.spacingVerticalXS }}>
                <Text>Change your DNS to Cloudflare (1.1.1.1) or Google (8.8.8.8)</Text>
              </li>
              <li style={{ marginBottom: tokens.spacingVerticalXS }}>
                <Text>Use a VPN like ProtonVPN or 1.1.1.1 VPN</Text>
              </li>
              <li style={{ marginBottom: tokens.spacingVerticalXS }}>
                <Text>Check your router/firewall settings</Text>
              </li>
            </ol>
            <Text style={{ marginTop: tokens.spacingVerticalM }}>
              For detailed troubleshooting, see:{' '}
              <a
                href="https://github.com/jimzrt/apprenticeVr#troubleshooting-guide"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: tokens.colorBrandForeground1 }}
              >
                Troubleshooting Guide
              </a>
            </Text>
          </div>
        )
      }

      // Handle other dependency errors
      const errorDetails: string[] = []
      if (!dependencyStatus?.sevenZip.ready) errorDetails.push('7zip')
      if (!dependencyStatus?.rclone.ready) errorDetails.push('rclone')
      if (!dependencyStatus?.adb.ready) errorDetails.push('adb')

      const failedDeps = errorDetails.length > 0 ? ` (${errorDetails.join(', ')})` : ''

      return (
        <div className={styles.loadingOrErrorContainer}>
          <Text weight="semibold" style={{ color: tokens.colorPaletteRedForeground1 }}>
            Dependency Error {failedDeps}
          </Text>
          <Text>{dependencyError}</Text>
        </div>
      )
    }
    let title = 'Getting things ready'
    let subtitle: string | undefined = 'This only takes a moment.'
    let progress: number | null = null

    if (dependencyProgress?.name === 'connectivity-check') {
      title = 'Checking network connectivity'
      subtitle = 'Make sure your computer is connected to the internet.'
      progress = dependencyProgress.percentage
    } else if (dependencyStatus?.rclone.downloading && dependencyProgress) {
      if (dependencyProgress.name === 'rclone-extract') {
        title = 'Setting up sync engine'
        subtitle = 'Extracting components — a few seconds left.'
      } else {
        title = 'Setting up sync engine'
        subtitle = `Downloading ${dependencyProgress.name}…`
        progress = dependencyProgress.percentage
      }
    } else if (dependencyStatus?.adb.downloading && dependencyProgress) {
      if (dependencyProgress.name === 'adb-extract') {
        title = 'Setting up device tools'
        subtitle = 'Extracting components — a few seconds left.'
      } else {
        title = 'Setting up device tools'
        subtitle = `Downloading ${dependencyProgress.name}…`
        progress = dependencyProgress.percentage
      }
    } else if (
      dependencyStatus &&
      (!dependencyStatus.sevenZip.ready ||
        !dependencyStatus.rclone.ready ||
        !dependencyStatus.adb.ready)
    ) {
      title = 'Setting up Fast Travel'
      subtitle = 'Preparing the required components.'
    }

    return (
      <div className={styles.loadingOrErrorContainer}>
        <QuestLoader title={title} subtitle={subtitle} progress={progress} />
      </div>
    )
  }

  return (
    <>
      <UploadGamesDialog />
      {renderCurrentView()}
    </>
  )
}

const AppLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DEVICE_LIST)
  const [appVersion, setAppVersion] = useState<string>('')
  const { colorScheme, setColorScheme } = useSettings()
  const [isTransfersOpen, setIsTransfersOpen] = useState(false)
  const [transfersTab, setTransfersTab] = useState<'downloads' | 'uploads'>(() => {
    try {
      const v = localStorage.getItem('vrcyberdeck:transfersTab')
      return v === 'uploads' ? 'uploads' : 'downloads'
    } catch {
      return 'downloads'
    }
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCreditsOpen, setIsCreditsOpen] = useState(false)
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)
  const mountNodeRef = useRef<HTMLDivElement>(null)
  const styles = useStyles()
  const { queue: downloadQueue } = useDownload()
  const { queue: uploadQueue } = useUpload()
  const { t } = useLanguage()

  useEffect(() => {
    window.api.app.getVersion().then(setAppVersion).catch(() => {})
  }, [])

  // Global "click sound" — fires whenever the user clicks any button-like
  // control. Uses capture so disabled buttons (which swallow click events)
  // and Fluent UI components are still covered. The sound itself is a no-op
  // unless the user dropped a click.{wav,mp3,ogg} into resources/sounds/ or
  // <userData>/sounds/.
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const btn = target.closest(
        'button, [role="button"], [role="tab"], [role="menuitem"], [role="option"], summary, a[href]'
      )
      if (!btn) return
      if (btn instanceof HTMLButtonElement && btn.disabled) return
      playSound('click')
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])

  const hasActiveTransfers = useMemo(() => {
    const activeDownload = downloadQueue.some((i) =>
      ['Queued', 'Downloading', 'Extracting', 'Installing'].includes(i.status)
    )
    const activeUpload = uploadQueue.some((i) =>
      ['Queued', 'Preparing', 'Uploading'].includes(i.status)
    )
    return activeDownload || activeUpload
  }, [downloadQueue, uploadQueue])

  // Keep a ref so the close-requested listener always sees the latest value
  // without needing to resubscribe (which would race with main-process events).
  const hasActiveTransfersRef = useRef(hasActiveTransfers)
  useEffect(() => {
    hasActiveTransfersRef.current = hasActiveTransfers
  }, [hasActiveTransfers])

  useEffect(() => {
    return window.api.app.onCloseRequested(() => {
      if (hasActiveTransfersRef.current) {
        setIsCloseConfirmOpen(true)
      } else {
        window.api.app.confirmClose()
      }
    })
  }, [])

  const handleDeviceConnected = (): void => {
    setCurrentView(AppView.GAMES)
  }

  const handleSkipConnection = (): void => {
    setCurrentView(AppView.GAMES)
  }

  const handleBackToDeviceList = (): void => {
    setCurrentView(AppView.DEVICE_LIST)
  }

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent): void => {
      setColorScheme(e.matches ? 'dark' : 'light')
    }

    darkModeMediaQuery.addEventListener('change', handleChange)

    return () => {
      darkModeMediaQuery.removeEventListener('change', handleChange)
    }
  }, [setColorScheme])

  const currentTheme = colorScheme === 'dark' ? teamsDarkTheme : teamsLightTheme

  return (
    <FluentProvider theme={currentTheme}>
      <AdbProvider>
        <GamesProvider>
          <GameDialogProvider>
            <div className={styles.root}>
              <Sidebar
                currentView={currentView === AppView.DEVICE_LIST ? 'devices' : 'library'}
                onSelectView={(v) =>
                  setCurrentView(v === 'devices' ? AppView.DEVICE_LIST : AppView.GAMES)
                }
                onOpenTransfers={() => setIsTransfersOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenCredits={() => setIsCreditsOpen(true)}
                appVersion={appVersion}
              />

              <div className={styles.quest_main}>
                <div className={styles.transferStrip}>
                  <TransferStrip />
                </div>

                <div className={styles.mainContent} id="mainContent">
                  <MainContent
                    currentView={currentView}
                    onDeviceConnected={handleDeviceConnected}
                    onSkipConnection={handleSkipConnection}
                    onBackToDeviceList={handleBackToDeviceList}
                    onTransfers={() => setIsTransfersOpen(true)}
                    onSettings={() => setIsSettingsOpen(true)}
                  />
                </div>
              </div>

              {/* Add UpdateNotification component here - it manages its own visibility */}
              <UpdateNotification />

              {/* Transfers drawer (Downloads + Uploads combined) */}
              <Drawer
                type="overlay"
                separator
                open={isTransfersOpen}
                onOpenChange={(_, { open }) => setIsTransfersOpen(open)}
                position="end"
                style={{ width: '700px', background: '#050514', borderLeft: '1px solid rgba(var(--vrcd-neon-raw),0.25)', ['--colorNeutralBackground1' as string]: '#050514', ['--colorNeutralForeground1' as string]: 'var(--vrcd-neon)', ['--colorNeutralForeground2' as string]: 'rgba(var(--vrcd-neon-raw),0.75)', ['--colorNeutralStroke1' as string]: 'rgba(var(--vrcd-neon-raw),0.2)', ['--colorBrandBackground' as string]: 'var(--vrcd-neon)', ['--colorNeutralForegroundOnBrand' as string]: '#050514' } as React.CSSProperties}
                mountNode={mountNodeRef.current}
              >
                <DrawerHeader style={{ background: '#050514', borderBottom: '1px solid rgba(var(--vrcd-neon-raw),0.15)', padding: '12px 20px' }}>
                  <DrawerHeaderTitle
                    action={
                      <Button
                        appearance="subtle"
                        aria-label={t('close')}
                        icon={<CloseIcon />}
                        onClick={() => setIsTransfersOpen(false)}
                        style={{ color: 'var(--vrcd-neon)' }}
                      />
                    }
                    style={{ color: 'var(--vrcd-neon)', fontFamily: 'monospace', letterSpacing: '0.08em' }}
                  >
                    Transfers
                  </DrawerHeaderTitle>
                </DrawerHeader>
                <DrawerBody style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, background: '#050514' }}>
                  <TabList
                    selectedValue={transfersTab}
                    onTabSelect={(_, d) => {
                      const tab = d.value as 'downloads' | 'uploads'
                      setTransfersTab(tab)
                      try { localStorage.setItem('vrcyberdeck:transfersTab', tab) } catch { /* ignore */ }
                    }}
                    style={{ padding: '0 16px', borderBottom: '1px solid rgba(var(--vrcd-neon-raw),0.15)', flexShrink: 0 }}
                  >
                    <Tab value="downloads" icon={<DownloadIcon />}>{t('downloads')}</Tab>
                    <Tab value="uploads" icon={<UploadIcon />}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t('uploads')}
                        {uploadQueue.filter((i) => i.status === 'Queued' || i.status === 'Preparing' || i.status === 'Uploading').length > 0 && (
                          <CounterBadge
                            count={uploadQueue.filter((i) => i.status === 'Queued' || i.status === 'Preparing' || i.status === 'Uploading').length}
                            size="small"
                            color="brand"
                          />
                        )}
                      </span>
                    </Tab>
                  </TabList>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    {transfersTab === 'downloads' ? (
                      <DownloadsView onClose={() => setIsTransfersOpen(false)} />
                    ) : (
                      <UploadsView />
                    )}
                  </div>
                </DrawerBody>
              </Drawer>

              {/* Close confirmation when transfers are still in progress */}
              {isCloseConfirmOpen && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.78)',
                    backdropFilter: 'blur(2px)'
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setIsCloseConfirmOpen(false)
                  }}
                >
                  <div
                    style={{
                      background: '#030310',
                      border: '1px solid rgba(var(--vrcd-neon-raw),0.45)',
                      maxWidth: '520px',
                      width: '90vw',
                      fontFamily: 'var(--vrcd-font-mono)',
                      borderRadius: '8px',
                      padding: '28px 32px',
                      boxShadow:
                        '0 0 50px rgba(var(--vrcd-neon-raw),0.10), 0 0 80px rgba(var(--vrcd-purple-raw),0.08)'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '20px',
                        color: 'var(--vrcd-purple)',
                        letterSpacing: '0.1em',
                        fontWeight: 700,
                        textAlign: 'center',
                        textShadow:
                          '0 0 10px rgba(var(--vrcd-purple-raw),0.7), 0 0 24px rgba(var(--vrcd-purple-raw),0.3)',
                        marginBottom: '14px',
                        textTransform: 'uppercase'
                      }}
                    >
                      [ TRANSFERS IN PROGRESS ]
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: 'var(--vrcd-neon)',
                        lineHeight: 1.7,
                        textAlign: 'center',
                        textShadow: '0 0 6px rgba(var(--vrcd-neon-raw),0.35)',
                        marginBottom: '24px'
                      }}
                    >
                      Are you sure you want to leave the CyberDeck?
                      <br />
                      Transfers are still happening. Leaving will stop these
                      <br />
                      and make you restart them.
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => setIsCloseConfirmOpen(false)}
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: '2px solid rgba(var(--vrcd-neon-raw),0.65)',
                          color: 'var(--vrcd-neon)',
                          fontFamily: 'var(--vrcd-font-mono)',
                          fontSize: '13px',
                          letterSpacing: '0.1em',
                          padding: '12px 0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          boxShadow:
                            '0 0 14px rgba(var(--vrcd-neon-raw),0.15), inset 0 0 14px rgba(var(--vrcd-neon-raw),0.04)'
                        }}
                      >
                        Stay Jacked In
                      </button>
                      <button
                        onClick={() => {
                          setIsCloseConfirmOpen(false)
                          window.api.app.confirmClose()
                        }}
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: '2px solid rgba(var(--vrcd-purple-raw),0.7)',
                          color: 'var(--vrcd-purple)',
                          fontFamily: 'var(--vrcd-font-mono)',
                          fontSize: '13px',
                          letterSpacing: '0.1em',
                          padding: '12px 0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          boxShadow:
                            '0 0 14px rgba(var(--vrcd-purple-raw),0.18), inset 0 0 14px rgba(var(--vrcd-purple-raw),0.05)'
                        }}
                      >
                        Leave Anyway
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings modal — custom overlay bypasses Fluent Dialog width constraints */}
              {isSettingsOpen && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(2px)'
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setIsSettingsOpen(false)
                  }}
                >
                  <div
                    style={{
                      width: '96vw',
                      maxWidth: '1400px',
                      maxHeight: '92vh',
                      background: '#050514',
                      border: '1px solid rgba(var(--vrcd-neon-raw),0.25)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 0 40px rgba(var(--vrcd-neon-raw),0.06)'
                    }}
                  >
                    <Button
                      appearance="subtle"
                      icon={<CloseIcon />}
                      aria-label={t('close')}
                      onClick={() => setIsSettingsOpen(false)}
                      style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, color: 'var(--vrcd-neon)' }}
                    />
                    <Settings />
                  </div>
                </div>
              )}
            </div>
            <div
              id="portal-parent"
              style={{
                zIndex: 1000,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none'
              }}
            >
              <div ref={mountNodeRef} id="portal" style={{ pointerEvents: 'auto' }}></div>
            </div>
          </GameDialogProvider>
        </GamesProvider>
      </AdbProvider>
      <CreditsDialog
        open={isCreditsOpen}
        onClose={() => setIsCreditsOpen(false)}
        variant="main"
      />
    </FluentProvider>
  )
}

const AppLayoutWithProviders: React.FC = () => {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <LanguageProvider>
          <DependencyProvider>
            <DownloadProvider>
              <UploadProvider>
                <AppLayout />
              </UploadProvider>
            </DownloadProvider>
          </DependencyProvider>
        </LanguageProvider>
      </SettingsProvider>
    </ErrorBoundary>
  )
}

export default AppLayoutWithProviders
