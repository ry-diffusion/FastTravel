import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AdbProvider } from '../context/AdbProvider'
import { GamesProvider } from '../context/GamesProvider'
import DeviceList from './DeviceList'
import GamesView from './GamesView'
import Settings from './Settings'
import { UpdateNotification } from './UpdateNotification'
import UploadGamesDialog from './UploadGamesDialog'
import { Button } from '@heroui/react'
import { FluentProvider, teamsDarkTheme, teamsLightTheme } from '@fluentui/react-components'
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

export enum AppView {
  DEVICE_LIST,
  GAMES,
  TRANSFERS,
  SETTINGS
}

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
    return (
      <GamesView
        onBackToDevices={onBackToDeviceList}
        onTransfers={onTransfers}
        onSettings={onSettings}
      />
    )
  }

  if (!dependenciesReady) {
    if (dependencyError) {
      // Connectivity error: list failed URLs
      if (dependencyError.startsWith('CONNECTIVITY_ERROR|')) {
        const failedUrls = dependencyError.replace('CONNECTIVITY_ERROR|', '').split('|')

        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-medium font-semibold text-danger">Network Connectivity Issues</p>
            <p className="text-small text-default-500">Cannot reach the following services:</p>
            <ul className="text-left mt-2 flex flex-col gap-1">
              {failedUrls.map((url, i) => (
                <li key={i} className="text-tiny font-mono text-default-600">
                  {url}
                </li>
              ))}
            </ul>
            <p className="text-small text-default-500 mt-2">
              This is likely due to DNS or firewall restrictions. Please try:
            </p>
            <ol className="text-left flex flex-col gap-1 mt-1">
              <li className="text-small text-default-600">
                Change your DNS to Cloudflare (1.1.1.1) or Google (8.8.8.8)
              </li>
              <li className="text-small text-default-600">Use a VPN like ProtonVPN or 1.1.1.1 VPN</li>
              <li className="text-small text-default-600">Check your router/firewall settings</li>
            </ol>
            <p className="text-small text-default-500 mt-2">
              For detailed troubleshooting, see:{' '}
              <a
                href="https://github.com/jimzrt/apprenticeVr#troubleshooting-guide"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Troubleshooting Guide
              </a>
            </p>
          </div>
        )
      }

      // Other dependency errors
      const errorDetails: string[] = []
      if (!dependencyStatus?.sevenZip.ready) errorDetails.push('7zip')
      if (!dependencyStatus?.rclone.ready) errorDetails.push('rclone')
      if (!dependencyStatus?.adb.ready) errorDetails.push('adb')
      const failedDeps = errorDetails.length > 0 ? ` (${errorDetails.join(', ')})` : ''

      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-medium font-semibold text-danger">
            Dependency Error{failedDeps}
          </p>
          <p className="text-small text-default-500">{dependencyError}</p>
        </div>
      )
    }

    // Loading / progress state
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
      <div className="flex-1 flex flex-col items-center justify-center">
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
  const { queue: downloadQueue } = useDownload()
  const { queue: uploadQueue } = useUpload()

  useEffect(() => {
    window.api.app.getVersion().then(setAppVersion).catch(() => {})
  }, [])

  // Global click sound — fires on any button-like control.
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

  // Ref so the close-requested listener always sees the latest value.
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

  const handleDeviceConnected = (): void => setCurrentView(AppView.GAMES)
  const handleSkipConnection = (): void => setCurrentView(AppView.GAMES)
  const handleBackToDeviceList = (): void => setCurrentView(AppView.DEVICE_LIST)

  // Sync color scheme with OS preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent): void => {
      setColorScheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [setColorScheme])

  // Keep the document class in sync with the setting
  useEffect(() => {
    const root = document.documentElement
    if (colorScheme === 'light') {
      root.classList.remove('dark')
      root.classList.add('light')
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
    }
  }, [colorScheme])

  const currentTheme = colorScheme === 'dark' ? teamsDarkTheme : teamsLightTheme

  return (
    <FluentProvider theme={currentTheme}>
      <AdbProvider>
        <GamesProvider>
          <GameDialogProvider>
            {/* App shell */}
            <div className="flex flex-row h-screen overflow-hidden bg-background text-foreground">
              <Sidebar
                currentView={
                  currentView === AppView.DEVICE_LIST
                    ? 'devices'
                    : currentView === AppView.TRANSFERS
                      ? 'transfers'
                      : currentView === AppView.SETTINGS
                        ? 'settings'
                        : 'library'
                }
                onSelectView={(v: SidebarView) => {
                  setCurrentView(
                    v === 'devices'
                      ? AppView.DEVICE_LIST
                      : v === 'transfers'
                        ? AppView.TRANSFERS
                        : v === 'settings'
                          ? AppView.SETTINGS
                          : AppView.GAMES
                  )
                }}
                onOpenCredits={() => setIsCreditsOpen(true)}
                appVersion={appVersion}
              />

              {/* Main column */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                {/* Transfer strip — collapses to nothing when idle */}
                <div className="shrink-0 px-5 overflow-hidden">
                  <TransferStrip />
                </div>

                {/* Routed page */}
                <div
                  className="flex-1 min-h-0 flex flex-col overflow-hidden relative"
                  id="mainContent"
                >
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

              {/* Update notification — manages its own visibility */}
              <UpdateNotification />

              {/* Close confirmation when transfers are still in progress */}
              {isCloseConfirmOpen && (
                <div
                  className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setIsCloseConfirmOpen(false)
                  }}
                >
                  <div className="w-[min(440px,90vw)] bg-content1 border border-divider rounded-large p-6 flex flex-col gap-3 shadow-2xl">
                    <h2 className="m-0 text-large font-semibold text-foreground tracking-tight">
                      Transfers still in progress
                    </h2>
                    <p className="m-0 text-small text-default-500 leading-relaxed">
                      Closing now will stop any active downloads, uploads, and installs.
                      You can resume them later from the Transfers page.
                    </p>
                    <div className="flex gap-2 justify-end mt-2">
                      <Button
                        variant="bordered"
                        size="sm"
                        onPress={() => setIsCloseConfirmOpen(false)}
                      >
                        Stay
                      </Button>
                      <Button
                        color="primary"
                        size="sm"
                        onPress={() => {
                          setIsCloseConfirmOpen(false)
                          window.api.app.confirmClose()
                        }}
                      >
                        Quit anyway
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Portal mount node — pointer-events passthrough */}
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
              <div ref={mountNodeRef} id="portal" style={{ pointerEvents: 'auto' }} />
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
