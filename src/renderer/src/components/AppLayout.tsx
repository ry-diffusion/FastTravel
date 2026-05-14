import React, { useEffect, useMemo, useRef, useState } from 'react'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent } from '@renderer/components/ui/card'

import { ErrorBoundary } from './ErrorBoundary'
import { UpdateNotification } from './UpdateNotification'
import CreditsDialog from './CreditsDialog'
import UploadGamesDialog from './UploadGamesDialog'
import Sidebar, { SidebarView } from './Sidebar'
import TransferStrip from './TransferStrip'
import QuestLoader from './QuestLoader'

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
import { playSound } from '../hooks/useSoundEffects'

// ─── Lazy-import page components so missing files cause a clean stub ──────────
import DeviceList from './DeviceList'
import GamesView from './GamesView'
import TransfersPage from './TransfersPage'
import Settings from './Settings'

// ─── App view enum ─────────────────────────────────────────────────────────────
export enum AppView {
  DEVICE_LIST,
  GAMES,
  TRANSFERS,
  SETTINGS
}

// ─── SidebarView ↔ AppView mapping ────────────────────────────────────────────
function appViewToSidebarView(v: AppView): SidebarView {
  switch (v) {
    case AppView.DEVICE_LIST:
      return 'devices'
    case AppView.TRANSFERS:
      return 'transfers'
    case AppView.SETTINGS:
      return 'settings'
    default:
      return 'library'
  }
}

function sidebarViewToAppView(v: SidebarView): AppView {
  switch (v) {
    case 'devices':
      return AppView.DEVICE_LIST
    case 'transfers':
      return AppView.TRANSFERS
    case 'settings':
      return AppView.SETTINGS
    default:
      return AppView.GAMES
  }
}

// ─── MainContent — switches on currentView ────────────────────────────────────
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
    progress: dependencyProgress
  } = useDependency()

  if (!dependenciesReady) {
    if (dependencyError) {
      // Connectivity error: list failed URLs
      if (dependencyError.startsWith('CONNECTIVITY_ERROR|')) {
        const failedUrls = dependencyError.replace('CONNECTIVITY_ERROR|', '').split('|')

        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
            <Card className="w-full max-w-md border-destructive/30 bg-destructive/10">
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm font-semibold text-destructive">
                  Network connectivity issues
                </p>
                <p className="text-xs text-muted-foreground">
                  Cannot reach the following services:
                </p>
                <ul className="flex flex-col gap-1 text-left">
                  {failedUrls.map((url, i) => (
                    <li key={i} className="font-mono text-xs text-muted-foreground">
                      {url}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  This is likely due to DNS or firewall restrictions. Try:
                </p>
                <ol className="flex flex-col gap-1 text-left">
                  <li className="text-xs text-muted-foreground">
                    1. Change your DNS to Cloudflare (1.1.1.1) or Google (8.8.8.8)
                  </li>
                  <li className="text-xs text-muted-foreground">
                    2. Use a VPN like ProtonVPN
                  </li>
                  <li className="text-xs text-muted-foreground">
                    3. Check your router / firewall settings
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  See the{' '}
                  <a
                    href="https://github.com/jimzrt/apprenticeVr#troubleshooting-guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    troubleshooting guide
                  </a>{' '}
                  for more help.
                </p>
              </CardContent>
            </Card>
          </div>
        )
      }

      // Generic error
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
          <Card className="w-full max-w-md border-destructive/30 bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm font-semibold text-destructive">Startup error</p>
              <p className="mt-1 text-xs text-muted-foreground">{dependencyError}</p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <QuestLoader
        title="Getting ready"
        subtitle={
          dependencyProgress
            ? `Setting up ${dependencyProgress.name}…`
            : 'Checking dependencies…'
        }
        progress={dependencyProgress?.percentage ?? null}
      />
    )
  }

  // Dependencies ready — render the requested view
  switch (currentView) {
    case AppView.DEVICE_LIST:
      return <DeviceList onConnected={onDeviceConnected} onSkip={onSkipConnection} />
    case AppView.TRANSFERS:
      return <TransfersPage />
    case AppView.SETTINGS:
      return <Settings />
    default:
      return (
        <GamesView
          onBackToDevices={onBackToDeviceList}
          onTransfers={onTransfers}
          onSettings={onSettings}
        />
      )
  }
}

// ─── AppLayout inner (consumers of SettingsProvider + Download/Upload) ────────
const AppLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DEVICE_LIST)
  const [appVersion, setAppVersion] = useState<string>('')
  const [isCreditsOpen, setIsCreditsOpen] = useState(false)
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)

  const { colorScheme, setColorScheme } = useSettings()
  const { queue: downloadQueue } = useDownload()
  const { queue: uploadQueue } = useUpload()

  // Fetch app version once
  useEffect(() => {
    window.api.app.getVersion().then(setAppVersion).catch(() => {})
  }, [])

  // Global click-sound handler
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

  // Detect active transfers
  const hasActiveTransfers = useMemo(() => {
    const activeDl = downloadQueue.some((i) =>
      ['Queued', 'Downloading', 'Extracting', 'Installing'].includes(i.status)
    )
    const activeUl = uploadQueue.some((i) =>
      ['Queued', 'Preparing', 'Uploading'].includes(i.status)
    )
    return activeDl || activeUl
  }, [downloadQueue, uploadQueue])

  // Keep ref current for the IPC listener (avoids stale closure)
  const hasActiveTransfersRef = useRef(hasActiveTransfers)
  useEffect(() => {
    hasActiveTransfersRef.current = hasActiveTransfers
  }, [hasActiveTransfers])

  // Wire close-requested IPC
  useEffect(() => {
    return window.api.app.onCloseRequested(() => {
      if (hasActiveTransfersRef.current) {
        setIsCloseConfirmOpen(true)
      } else {
        window.api.app.confirmClose()
      }
    })
  }, [])

  // Sync dark/light class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorScheme === 'dark')
    document.documentElement.classList.toggle('light', colorScheme === 'light')
  }, [colorScheme])

  // Sync with OS preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent): void => {
      setColorScheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [setColorScheme])

  const handleDeviceConnected = (): void => setCurrentView(AppView.GAMES)
  const handleSkipConnection = (): void => setCurrentView(AppView.GAMES)
  const handleBackToDeviceList = (): void => setCurrentView(AppView.DEVICE_LIST)

  return (
    <TooltipProvider>
      {/* Root shell */}
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        {/* Left sidebar */}
        <Sidebar
          currentView={appViewToSidebarView(currentView)}
          onSelectView={(v: SidebarView) => setCurrentView(sidebarViewToAppView(v))}
          onOpenCredits={() => setIsCreditsOpen(true)}
          appVersion={appVersion}
        />

        {/* Main column */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Transfer strip — null when idle */}
          <TransferStrip />

          {/* Routed page */}
          <div
            className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
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
      </div>

      {/* Update notification — manages own visibility */}
      <UpdateNotification />

      {/* Off-limits dialogs — rendered outside the layout grid */}
      <UploadGamesDialog />
      <CreditsDialog
        open={isCreditsOpen}
        onClose={() => setIsCreditsOpen(false)}
        variant="main"
      />

      {/* Close-confirm modal */}
      <Dialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfers still in progress</DialogTitle>
            <DialogDescription>
              Closing now will stop any active downloads, uploads, and installs. You can resume
              them later from the Transfers page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCloseConfirmOpen(false)}
            >
              Stay
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsCloseConfirmOpen(false)
                window.api.app.confirmClose()
              }}
            >
              Quit anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

// ─── Exported root — wraps AppLayout in full provider chain ───────────────────
const AppLayoutWithProviders: React.FC = () => {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <LanguageProvider>
          <DependencyProvider>
            <DownloadProvider>
              <UploadProvider>
                <AdbProvider>
                  <GamesProvider>
                    <GameDialogProvider>
                      <AppLayout />
                    </GameDialogProvider>
                  </GamesProvider>
                </AdbProvider>
              </UploadProvider>
            </DownloadProvider>
          </DependencyProvider>
        </LanguageProvider>
      </SettingsProvider>
    </ErrorBoundary>
  )
}

export default AppLayoutWithProviders
