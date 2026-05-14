import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AdbProvider } from '../context/AdbProvider'
import { GamesProvider } from '../context/GamesProvider'
import DeviceList from './DeviceList'
import GamesView from './GamesView'
import Settings from './Settings'
import { UpdateNotification } from './UpdateNotification'
import UploadGamesDialog from './UploadGamesDialog'
import {
  FluentProvider,
  makeStyles,
  tokens,
  Text,
  teamsDarkTheme,
  teamsLightTheme
} from '@fluentui/react-components'
import QuestLoader from './QuestLoader'
import Sidebar, { SidebarView } from './Sidebar'
import TransfersPage from './TransfersPage'
import { useDependency } from '../hooks/useDependency'
import { DependencyProvider } from '../context/DependencyProvider'
import { DownloadProvider } from '../context/DownloadProvider'
import { SettingsProvider } from '../context/SettingsProvider'
import { useDownload } from '../hooks/useDownload'
import { UploadProvider } from '@renderer/context/UploadProvider'
import { useUpload } from '@renderer/hooks/useUpload'
import { GameDialogProvider } from '@renderer/context/GameDialogProvider'
import { useSettings } from '@renderer/hooks/useSettings'
import { LanguageProvider } from '@renderer/context/LanguageProvider'
import CreditsDialog from './CreditsDialog'
import TransferStrip from './TransferStrip'
import { ErrorBoundary } from './ErrorBoundary'
import { playSound } from '../hooks/useSoundEffects'
import '../assets/credits-dialog.css'

enum AppView {
  DEVICE_LIST,
  GAMES,
  TRANSFERS,
  SETTINGS
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
    if (currentView === AppView.TRANSFERS) {
      return <TransfersPage />
    }
    if (currentView === AppView.SETTINGS) {
      return <Settings />
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
  const [isCreditsOpen, setIsCreditsOpen] = useState(false)
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)
  const mountNodeRef = useRef<HTMLDivElement>(null)
  const styles = useStyles()
  const { queue: downloadQueue } = useDownload()
  const { queue: uploadQueue } = useUpload()

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
                currentView={
                  currentView === AppView.DEVICE_LIST ? 'devices'
                  : currentView === AppView.TRANSFERS ? 'transfers'
                  : currentView === AppView.SETTINGS ? 'settings'
                  : 'library'
                }
                onSelectView={(v: SidebarView) => {
                  setCurrentView(
                    v === 'devices' ? AppView.DEVICE_LIST
                    : v === 'transfers' ? AppView.TRANSFERS
                    : v === 'settings' ? AppView.SETTINGS
                    : AppView.GAMES
                  )
                }}
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
                    onTransfers={() => setCurrentView(AppView.TRANSFERS)}
                    onSettings={() => setCurrentView(AppView.SETTINGS)}
                  />
                </div>
              </div>

              {/* Add UpdateNotification component here - it manages its own visibility */}
              <UpdateNotification />


              {/* Close confirmation when transfers are still in progress */}
              {isCloseConfirmOpen && (
                <div
                  className="quest-modal-backdrop"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setIsCloseConfirmOpen(false)
                  }}
                >
                  <div className="quest-modal">
                    <h2 className="quest-modal__title">Transfers still in progress</h2>
                    <p className="quest-modal__body">
                      Closing now will stop any active downloads, uploads, and installs.
                      You can resume them later from the Transfers page.
                    </p>
                    <div className="quest-modal__actions">
                      <button
                        type="button"
                        className="quest-btn quest-btn--ghost"
                        onClick={() => setIsCloseConfirmOpen(false)}
                      >
                        Stay
                      </button>
                      <button
                        type="button"
                        className="quest-btn quest-btn--primary"
                        onClick={() => {
                          setIsCloseConfirmOpen(false)
                          window.api.app.confirmClose()
                        }}
                      >
                        Quit anyway
                      </button>
                    </div>
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
