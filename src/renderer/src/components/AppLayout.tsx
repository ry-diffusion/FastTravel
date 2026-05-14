import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, CardBody, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react'
import { FluentProvider, teamsDarkTheme, teamsLightTheme } from '@fluentui/react-components'
import { AdbProvider } from '../context/AdbProvider'
import { GamesProvider } from '../context/GamesProvider'
import { GameDialogProvider } from '@renderer/context/GameDialogProvider'
import { DependencyProvider } from '../context/DependencyProvider'
import { DownloadProvider } from '../context/DownloadProvider'
import { SettingsProvider } from '../context/SettingsProvider'
import { UploadProvider } from '@renderer/context/UploadProvider'
import { LanguageProvider } from '@renderer/context/LanguageProvider'
import { useSettings } from '@renderer/hooks/useSettings'
import { useDownload } from '../hooks/useDownload'
import { useUpload } from '@renderer/hooks/useUpload'
import { useDependency } from '../hooks/useDependency'
import { ErrorBoundary } from './ErrorBoundary'
import { UpdateNotification } from './UpdateNotification'
import CreditsDialog from './CreditsDialog'
import UploadGamesDialog from './UploadGamesDialog'
import Sidebar, { SidebarView } from './Sidebar'
import TransferStrip from './TransferStrip'
import QuestLoader from './QuestLoader'
import DeviceList from './DeviceList'
import GamesView from './GamesView'
import TransfersPage from './TransfersPage'
import Settings from './Settings'
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
            <Card className="bg-danger/10 border border-danger/30 max-w-md w-full">
              <CardBody className="gap-3">
                <p className="text-sm font-semibold text-danger">Network connectivity issues</p>
                <p className="text-xs text-default-500">Cannot reach the following services:</p>
                <ul className="text-left flex flex-col gap-1">
                  {failedUrls.map((url, i) => (
                    <li key={i} className="text-xs font-mono text-default-500">
                      {url}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-default-500">
                  This is likely due to DNS or firewall restrictions. Please try:
                </p>
                <ol className="text-left flex flex-col gap-1">
                  <li className="text-xs text-default-500">
                    Change your DNS to Cloudflare (1.1.1.1) or Google (8.8.8.8)
                  </li>
                  <li className="text-xs text-default-500">Use a VPN like ProtonVPN or 1.1.1.1 VPN</li>
                  <li className="text-xs text-default-500">Check your router/firewall settings</li>
                </ol>
                <p className="text-xs text-default-500">
                  For detailed troubleshooting, see:{' '}
                  <a
                    href="https://github.com/jimzrt/apprenticeVr#troubleshooting-guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Troubleshooting guide
                  </a>
                </p>
              </CardBody>
            </Card>
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
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
          <Card className="bg-danger/10 border border-danger/30 max-w-md w-full">
            <CardBody className="gap-2">
              <p className="text-sm font-semibold text-danger">
                Dependency error{failedDeps}
              </p>
              <p className="text-xs text-default-500">{dependencyError}</p>
            </CardBody>
          </Card>
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
      <div className="flex-1 flex flex-col items-center justify-center p-8">
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

  // Keep the document class in sync with the setting; preserve .quest class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorScheme === 'dark')
    document.documentElement.classList.toggle('light', colorScheme === 'light')
  }, [colorScheme])

  const currentTheme = colorScheme === 'dark' ? teamsDarkTheme : teamsLightTheme

  return (
    <FluentProvider theme={currentTheme}>
      <AdbProvider>
        <GamesProvider>
          <GameDialogProvider>
            {/* App shell */}
            <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
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
              <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
                {/* Transfer strip — collapses to null when idle */}
                <TransferStrip />

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
              </main>

              {/* Update notification — manages its own visibility */}
              <UpdateNotification />
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

            {/* Close confirmation modal */}
            <Modal
              isOpen={isCloseConfirmOpen}
              onClose={() => setIsCloseConfirmOpen(false)}
              backdrop="blur"
              size="sm"
            >
              <ModalContent>
                {(onClose) => (
                  <>
                    <ModalHeader className="text-base font-semibold">
                      Transfers still in progress
                    </ModalHeader>
                    <ModalBody>
                      <p className="text-sm text-default-500 leading-relaxed">
                        Closing now will stop any active downloads, uploads, and installs.
                        You can resume them later from the Transfers page.
                      </p>
                    </ModalBody>
                    <ModalFooter className="gap-2">
                      <Button variant="bordered" size="sm" onPress={onClose}>
                        Stay
                      </Button>
                      <Button
                        color="primary"
                        size="sm"
                        onPress={() => {
                          onClose()
                          window.api.app.confirmClose()
                        }}
                      >
                        Quit anyway
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </ModalContent>
            </Modal>
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
