import React, { useState, useEffect, useRef } from 'react'
import CreditsDialog from './CreditsDialog'
import ServerConfigSettings from './ServerConfigSettings'
import '../assets/credits-dialog.css'
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Input,
  Select,
  SelectItem,
  Slider,
  Spinner,
  Switch,
  cn
} from '@heroui/react'
import { useSettings } from '../hooks/useSettings'
import { useGames } from '../hooks/useGames'
import { useLogs } from '../hooks/useLogs'
import { useLanguage } from '../hooks/useLanguage'
import { useAdb } from '../hooks/useAdb'
import { useExtrasSettings, FONT_FAMILY_OPTIONS, FontFamilyChoice } from '../hooks/useExtrasSettings'
import { useSoundEffects, SOUND_NAMES } from '../hooks/useSoundEffects'

// Supported speed units with conversion factors to KB/s
const SPEED_UNITS = [
  { label: 'KB/s', value: 'kbps', factor: 1 },
  { label: 'MB/s', value: 'mbps', factor: 1024 }
]

// ─── Shared primitives ───────────────────────────────────────────────────────

/** A labelled Switch row used in every section. */
const SwitchRow: React.FC<{
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  isDisabled?: boolean
}> = ({ label, description, checked, onChange, isDisabled }) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-default-900">{label}</span>
      <span className="text-xs text-default-500 leading-relaxed">{description}</span>
    </div>
    <Switch
      isSelected={checked}
      onValueChange={onChange}
      isDisabled={isDisabled}
      size="sm"
      color="primary"
      className="shrink-0 mt-0.5"
    />
  </div>
)

const RowDivider = (): React.JSX.Element => <Divider className="opacity-40" />

// ─── BlacklistSettings ────────────────────────────────────────────────────────
const BlacklistSettings: React.FC = () => {
  const { t } = useLanguage()
  const { getBlacklistGames, removeGameFromBlacklist } = useGames()
  const [blacklistGames, setBlacklistGames] = useState<
    { packageName: string; version: number | 'any' }[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removeSuccess, setRemoveSuccess] = useState(false)

  const loadBlacklistGames = async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      const games = await getBlacklistGames()
      setBlacklistGames(games)
    } catch (err) {
      console.error('Error loading blacklisted games:', err)
      setError('Failed to load blacklisted games')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBlacklistGames()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRemoveFromBlacklist = async (packageName: string): Promise<void> => {
    try {
      setError(null)
      await removeGameFromBlacklist(packageName)
      await loadBlacklistGames()
      setRemoveSuccess(true)
      setTimeout(() => setRemoveSuccess(false), 3000)
    } catch (err) {
      console.error('Error removing game from blacklist:', err)
      setError(t('blacklistRemoveError'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="sm" label={t('loadingBlacklist')} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-default-500">{t('blacklistedGamesDesc')}</p>

      {blacklistGames.length === 0 ? (
        <div className="flex justify-center items-center py-8 text-default-400 text-sm">
          {t('noBlacklistedGames')}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {blacklistGames.map((game) => (
            <div
              key={`${game.packageName}-${game.version}`}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-large bg-content2"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-default-800 truncate">
                  {game.packageName}
                </span>
                <span className="text-xs text-default-400">
                  {game.version === 'any' ? t('allVersions') : `v${game.version}`}
                </span>
              </div>
              <Button
                variant="light"
                color="danger"
                size="sm"
                onPress={() => handleRemoveFromBlacklist(game.packageName)}
                aria-label={t('remove')}
              >
                {t('remove')}
              </Button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}
      {removeSuccess && (
        <p className="text-success text-sm">{t('blacklistRemoveSuccess')}</p>
      )}
    </div>
  )
}

// ─── LogUploadSettings ────────────────────────────────────────────────────────
const LogUploadSettings: React.FC = () => {
  const { t } = useLanguage()
  const {
    isUploading,
    uploadError,
    uploadSuccess,
    shareableUrl,
    slug,
    uploadCurrentLog,
    clearUploadState,
    openLogFolder,
    openLogFile
  } = useLogs()

  const handleUploadLog = async (): Promise<void> => {
    clearUploadState()
    await uploadCurrentLog()
  }

  const handleCopySlug = (): void => {
    if (slug) navigator.clipboard.writeText(slug)
  }

  const handleCopyUrl = (): void => {
    if (shareableUrl) navigator.clipboard.writeText(shareableUrl)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-default-500">{t('logUploadDesc')}</p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="flat"
          color="default"
          size="sm"
          onPress={() => openLogFolder()}
        >
          Open log folder
        </Button>
        <Button
          variant="flat"
          color="default"
          size="sm"
          onPress={() => openLogFile()}
        >
          Open log file
        </Button>
        <Button
          color="primary"
          size="sm"
          isDisabled={isUploading}
          onPress={handleUploadLog}
        >
          {isUploading ? t('uploading_log') : t('uploadCurrentLog')}
        </Button>
      </div>

      {uploadError && <p className="text-danger text-sm">{uploadError}</p>}

      {uploadSuccess && shareableUrl && (
        <div className="flex flex-col gap-3 p-3 rounded-large bg-success/10 border border-success/20">
          <p className="text-success text-sm font-medium">{t('logUploadSuccess')}</p>

          {slug && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-default-600">{t('rentryCode')}</span>
              <div className="flex items-center gap-2">
                <Input
                  value={slug}
                  isReadOnly
                  size="sm"
                  classNames={{ input: 'font-mono text-base font-bold' }}
                  className="max-w-[220px]"
                />
                <Button size="sm" color="primary" onPress={handleCopySlug}>
                  {t('copyCode')}
                </Button>
              </div>
              <p className="text-xs text-default-400">{t('rentryCodeHint')}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-default-600">{t('url')}</span>
            <div className="flex items-center gap-2">
              <Input
                value={shareableUrl}
                isReadOnly
                size="sm"
                classNames={{ input: 'font-mono text-xs' }}
                className="flex-1"
              />
              <Button size="sm" variant="flat" onPress={handleCopyUrl}>
                {t('copyUrl')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-default-400">{t('logUploadHint')}</p>
    </div>
  )
}

// ─── ExtraSystemsSettings ─────────────────────────────────────────────────────
const ExtraSystemsSettings: React.FC = () => {
  const {
    disableAutoUpdate, setDisableAutoUpdate,
    fontScale, setFontScale,
    deleteOnRemove, setDeleteOnRemove,
    disableSideloading, setDisableSideloading,
    colorblindMode, setColorblindMode,
    accentColor, setAccentColor,
    fontFamily, setFontFamily
  } = useExtrasSettings()

  const {
    enabled: soundEnabled,
    volume: soundVolume,
    loaded: soundLoaded,
    perName: soundPerName,
    setEnabled: setSoundEnabled,
    setVolume: setSoundVolume,
    setPerName: setSoundPerName,
    play: playSfx
  } = useSoundEffects()

  const anySoundLoaded = SOUND_NAMES.some((n) => soundLoaded[n])

  const [maxConcurrent, setMaxConcurrentState] = useState<number>(3)
  const [existingDlAction, setExistingDlActionState] = useState<'ask' | 'reinstall' | 'redownload'>('ask')
  const [limitExtractionThreads, setLimitExtractionThreadsState] = useState<boolean>(true)

  useEffect(() => {
    window.api.settings.getExistingDownloadAction().then(setExistingDlActionState).catch(() => {/* ignore */})
  }, [])

  const handleSetExistingDlAction = (v: 'ask' | 'reinstall' | 'redownload'): void => {
    setExistingDlActionState(v)
    window.api.settings.setExistingDownloadAction(v).catch(() => {/* ignore */})
  }

  useEffect(() => {
    window.api.settings.getMaxConcurrentDownloads().then(setMaxConcurrentState).catch(() => {/* ignore */})
  }, [])

  const handleSetMaxConcurrent = (n: number): void => {
    setMaxConcurrentState(n)
    window.api.settings.setMaxConcurrentDownloads(n).catch(() => {/* ignore */})
  }

  useEffect(() => {
    window.api.settings.getLimitExtractionThreads().then(setLimitExtractionThreadsState).catch(() => {/* ignore */})
  }, [])

  const handleSetLimitExtractionThreads = (v: boolean): void => {
    setLimitExtractionThreadsState(v)
    window.api.settings.setLimitExtractionThreads(v).catch(() => {/* ignore */})
  }

  const totalCpuThreads = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 0) : 0
  const limitedThreadCount = Math.max(1, Math.floor(totalCpuThreads / 3))

  const fontFamilyKeys = Object.keys(FONT_FAMILY_OPTIONS) as FontFamilyChoice[]
  const selectedFontOpt = FONT_FAMILY_OPTIONS[fontFamily]

  return (
    <div className="flex flex-col gap-0">

      {/* Auto-update */}
      <SwitchRow
        label="Disable auto-update check on launch"
        description="Prevents the app from checking GitHub for updates when it starts. You can still update manually."
        checked={disableAutoUpdate}
        onChange={setDisableAutoUpdate}
      />
      <RowDivider />

      {/* Sideloading */}
      <SwitchRow
        label="Disable sideloading"
        description="Hides all Install / Uninstall / Reinstall / Update buttons. Downloads still work. Useful for sharing the app without install access."
        checked={disableSideloading}
        onChange={setDisableSideloading}
      />
      <RowDivider />

      {/* Colorblind mode */}
      <SwitchRow
        label="Colorblind mode"
        description="Improves contrast for red-green color vision deficiency. Takes effect immediately."
        checked={colorblindMode}
        onChange={setColorblindMode}
      />
      <RowDivider />

      {/* Accent color */}
      <div className="flex flex-col gap-2 py-3">
        <span className="text-sm font-medium text-default-900">Accent color</span>
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            type="color"
            value={accentColor ?? '#3D7DFF'}
            onChange={(e) => setAccentColor(e.target.value)}
            size="sm"
            className="w-16"
            classNames={{ input: 'h-8 p-0.5 cursor-pointer' }}
            aria-label="Pick accent color"
          />
          <Chip variant="flat" color="default" size="sm" className="font-mono text-xs">
            {accentColor ?? '#3D7DFF'}
          </Chip>
          {accentColor && (
            <Button
              variant="light"
              color="default"
              size="sm"
              onPress={() => setAccentColor(null)}
            >
              Reset to default
            </Button>
          )}
        </div>
        <p className="text-xs text-default-400">
          Changes the accent color across the whole UI. Takes effect immediately.
        </p>
      </div>
      <RowDivider />

      {/* Font family */}
      <div className="flex flex-col gap-2 py-3">
        <span className="text-sm font-medium text-default-900">Interface font</span>
        <Select
          selectedKeys={[fontFamily]}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0] as FontFamilyChoice
            if (k) setFontFamily(k)
          }}
          size="sm"
          className="max-w-[260px]"
          aria-label="Select font family"
        >
          {fontFamilyKeys.map((key) => (
            <SelectItem key={key} textValue={FONT_FAMILY_OPTIONS[key].label}>
              {FONT_FAMILY_OPTIONS[key].label}
            </SelectItem>
          ))}
        </Select>
        {selectedFontOpt && (
          <p
            className="text-sm text-default-500"
            style={{ fontFamily: selectedFontOpt.stack }}
          >
            The quick brown fox — {selectedFontOpt.hint}
          </p>
        )}
      </div>
      <RowDivider />

      {/* Sound effects */}
      <div className="flex flex-col gap-3 py-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-default-900">Sound effects</span>
          <Switch
            isSelected={soundEnabled}
            onValueChange={setSoundEnabled}
            size="sm"
            color="primary"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-default-500 w-14 shrink-0">Volume</span>
          <Slider
            size="sm"
            step={1}
            minValue={0}
            maxValue={100}
            value={Math.round(soundVolume * 100)}
            onChange={(v) => setSoundVolume((typeof v === 'number' ? v : (v as number[])[0]) / 100)}
            isDisabled={!soundEnabled}
            className="flex-1"
            color="primary"
          />
          <span className="text-xs text-default-500 w-9 text-right shrink-0">
            {Math.round(soundVolume * 100)}%
          </span>
          <Button
            variant="flat"
            size="sm"
            isDisabled={!soundEnabled || !soundLoaded.click}
            onPress={() => playSfx('click')}
          >
            Test
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-default-500">Available sounds</p>
          {SOUND_NAMES.map((name) => {
            const isLoaded = !!soundLoaded[name]
            const isEnabled = soundPerName[name] !== false
            return (
              <div key={name} className="flex items-center gap-3">
                <Switch
                  isSelected={isEnabled && soundEnabled && isLoaded}
                  onValueChange={(v) => setSoundPerName(name, v)}
                  isDisabled={!soundEnabled || !isLoaded}
                  size="sm"
                  color="primary"
                />
                <span className={cn(
                  'text-xs flex-1',
                  isLoaded
                    ? isEnabled ? 'text-default-700' : 'text-default-400'
                    : 'text-danger-400'
                )}>
                  {name}
                </span>
                <Chip
                  size="sm"
                  variant="flat"
                  color={isLoaded ? (isEnabled && soundEnabled ? 'success' : 'default') : 'danger'}
                  className="text-xs"
                >
                  {isLoaded ? (isEnabled ? 'enabled' : 'disabled') : 'missing'}
                </Chip>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-default-400 leading-relaxed">
          {anySoundLoaded
            ? 'Sounds play on button clicks (click), the boot intro typing (type), and the ADB shell matrix load (matrix).'
            : 'No sound files found. Drop click.wav, type.wav, or matrix.wav into your user-data sounds/ folder or the repo resources/sounds/ folder.'}
        </p>
      </div>
      <RowDivider />

      {/* Transfer list removal behavior */}
      <div className="flex flex-col gap-2 py-3">
        <span className="text-sm font-medium text-default-900">Transfer list — remove behavior</span>
        <p className="text-xs text-default-400">
          When removing a completed or errored item from the transfer list.
        </p>
        <Select
          selectedKeys={[deleteOnRemove]}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0] as 'ask' | 'keep' | 'delete'
            if (k) setDeleteOnRemove(k)
          }}
          size="sm"
          className="max-w-[220px]"
          aria-label="Remove behavior"
        >
          <SelectItem key="ask">Ask each time</SelectItem>
          <SelectItem key="keep">Keep files</SelectItem>
          <SelectItem key="delete">Delete files</SelectItem>
        </Select>
      </div>
      <RowDivider />

      {/* Concurrent downloads */}
      <div className="flex flex-col gap-2 py-3">
        <span className="text-sm font-medium text-default-900">Concurrent downloads</span>
        <p className="text-xs text-default-400">
          Number of games that download simultaneously. Takes effect on the next queue item.
        </p>
        <Select
          selectedKeys={[String(maxConcurrent)]}
          onSelectionChange={(keys) => {
            const k = Number(Array.from(keys)[0])
            if (k) handleSetMaxConcurrent(k)
          }}
          size="sm"
          className="max-w-[120px]"
          aria-label="Concurrent downloads"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <SelectItem key={String(n)}>{String(n)}</SelectItem>
          ))}
        </Select>
      </div>
      <RowDivider />

      {/* Extraction thread limit */}
      <SwitchRow
        label={`Limit extraction threads${totalCpuThreads ? ` (~${limitedThreadCount} of ${totalCpuThreads})` : ''}`}
        description="Caps 7-zip to ~1/3 of your CPU threads so archive extraction doesn't pin every core and stall the UI. Disable to let 7-zip use all available threads."
        checked={limitExtractionThreads}
        onChange={handleSetLimitExtractionThreads}
      />
      <RowDivider />

      {/* Existing download action */}
      <div className="flex flex-col gap-2 py-3">
        <span className="text-sm font-medium text-default-900">When download already exists on disk</span>
        <p className="text-xs text-default-400 leading-relaxed">
          When you click Download for a game whose folder already exists in your downloads path
          — from a previous run, another tool, or a cleared queue.
        </p>
        <Select
          selectedKeys={[existingDlAction]}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0] as 'ask' | 'reinstall' | 'redownload'
            if (k) handleSetExistingDlAction(k)
          }}
          size="sm"
          className="max-w-[280px]"
          aria-label="Existing download action"
        >
          <SelectItem key="ask">Ask me each time</SelectItem>
          <SelectItem key="reinstall">Install from existing</SelectItem>
          <SelectItem key="redownload">Re-download</SelectItem>
        </Select>
      </div>
      <RowDivider />

      {/* UI Zoom / Font Scale */}
      <div className="flex flex-col gap-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-default-900">UI zoom</span>
          <Chip variant="flat" color="default" size="sm">
            {Math.round(fontScale * 100)}%
          </Chip>
        </div>
        <Slider
          size="sm"
          step={0.125}
          minValue={0.75}
          maxValue={2.0}
          value={fontScale}
          onChange={(v) => setFontScale(typeof v === 'number' ? v : (v as number[])[0])}
          marks={[
            { value: 0.75, label: '75%' },
            { value: 1.0, label: '100%' },
            { value: 1.5, label: '150%' },
            { value: 2.0, label: '200%' }
          ]}
          color="primary"
          className="max-w-md"
        />
        <p className="text-xs text-default-400">
          Scales the entire UI via Electron zoom. Takes effect immediately.
        </p>
      </div>
    </div>
  )
}

// ─── MpUsernameSettings ───────────────────────────────────────────────────────
const MpUsernameSettings: React.FC = () => {
  const { userName, loadingUserName, setUserName, isConnected } = useAdb()
  const [editValue, setEditValue] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setEditValue(userName)
  }, [userName])

  const handleSave = async (): Promise<void> => {
    if (!editValue.trim()) return
    try {
      await setUserName(editValue.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error('Failed to set username:', e)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-default-500">Your display name in VR multiplayer games.</p>
      {!isConnected && (
        <Chip variant="flat" color="warning" size="sm">
          Connect a device to change your username
        </Chip>
      )}
      <div className="flex items-center gap-2 max-w-sm">
        <Input
          value={editValue}
          onValueChange={setEditValue}
          placeholder="Enter VR display name"
          isDisabled={!isConnected}
          size="sm"
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
        />
        <Button
          color="primary"
          size="sm"
          onPress={handleSave}
          isDisabled={loadingUserName || !editValue.trim() || !isConnected}
        >
          {loadingUserName ? <Spinner size="sm" /> : 'Save'}
        </Button>
      </div>
      {saved && (
        <p className="text-success text-sm">Username saved.</p>
      )}
    </div>
  )
}

// ─── Settings (main) ─────────────────────────────────────────────────────────
const Settings: React.FC = () => {
  const {
    downloadPath,
    downloadSpeedLimit,
    uploadSpeedLimit,
    isLoading,
    error,
    setDownloadPath,
    setDownloadSpeedLimit,
    setUploadSpeedLimit
  } = useSettings()

  const [editedDownloadPath, setEditedDownloadPath] = useState(downloadPath)
  const [isCreditsOpen, setIsCreditsOpen] = useState(false)
  const [hideAdultContent, setHideAdultContentLocal] = useState<boolean>(() => {
    try { return localStorage.getItem('vrcyberdeck:hideAdult') !== 'false' } catch { return true }
  })

  // Speed limit state
  const [downloadSpeedInput, setDownloadSpeedInput] = useState(
    downloadSpeedLimit > 0 ? String(downloadSpeedLimit) : ''
  )
  const [uploadSpeedInput, setUploadSpeedInput] = useState(
    uploadSpeedLimit > 0 ? String(uploadSpeedLimit) : ''
  )
  const [downloadSpeedUnit, setDownloadSpeedUnit] = useState(SPEED_UNITS[0].value)
  const [uploadSpeedUnit, setUploadSpeedUnit] = useState(SPEED_UNITS[0].value)
  const originalDownloadKbps = useRef<number | null>(null)
  const originalUploadKbps = useRef<number | null>(null)

  const [localError, setLocalError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('')

  useEffect(() => {
    let mounted = true
    const p = window.api.app?.getVersion?.()
    if (p) p.then((v) => { if (mounted) setAppVersion(v) }).catch(() => {})
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    setEditedDownloadPath(downloadPath)
    if (downloadSpeedLimit === 0) {
      setDownloadSpeedInput('')
      originalDownloadKbps.current = null
    } else {
      setDownloadSpeedInput(String(downloadSpeedLimit))
      setDownloadSpeedUnit('kbps')
      originalDownloadKbps.current = downloadSpeedLimit
    }
    if (uploadSpeedLimit === 0) {
      setUploadSpeedInput('')
      originalUploadKbps.current = null
    } else {
      setUploadSpeedInput(String(uploadSpeedLimit))
      setUploadSpeedUnit('kbps')
      originalUploadKbps.current = uploadSpeedLimit
    }
  }, [downloadPath, downloadSpeedLimit, uploadSpeedLimit])

  const { t } = useLanguage()

  const handleSaveDownloadPath = async (): Promise<void> => {
    if (!editedDownloadPath) {
      setLocalError(t('downloadPathEmpty'))
      return
    }
    try {
      setLocalError(null)
      setSaveSuccess(false)
      await setDownloadPath(editedDownloadPath)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving download path:', err)
      setLocalError(t('failedToSavePath'))
    }
  }

  const handleSaveSpeedLimits = async (): Promise<void> => {
    try {
      setLocalError(null)
      setSaveSuccess(false)

      let downloadLimit: number
      let uploadLimit: number

      if (downloadSpeedInput.trim() === '') {
        downloadLimit = 0
      } else if (originalDownloadKbps.current !== null) {
        downloadLimit = originalDownloadKbps.current
      } else {
        const inputValue = parseFloat(downloadSpeedInput)
        if (isNaN(inputValue)) { setLocalError(t('invalidNumbers')); return }
        const factor = SPEED_UNITS.find((u) => u.value === downloadSpeedUnit)?.factor || 1
        downloadLimit = inputValue * factor
      }

      if (uploadSpeedInput.trim() === '') {
        uploadLimit = 0
      } else if (originalUploadKbps.current !== null) {
        uploadLimit = originalUploadKbps.current
      } else {
        const inputValue = parseFloat(uploadSpeedInput)
        if (isNaN(inputValue)) { setLocalError(t('invalidNumbers')); return }
        const factor = SPEED_UNITS.find((u) => u.value === uploadSpeedUnit)?.factor || 1
        uploadLimit = inputValue * factor
      }

      downloadLimit = Math.max(0, Math.round(downloadLimit))
      uploadLimit = Math.max(0, Math.round(uploadLimit))

      await setDownloadSpeedLimit(downloadLimit)
      await setUploadSpeedLimit(uploadLimit)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving speed limits:', err)
      setLocalError(t('failedToSaveSpeed'))
    }
  }

  const handleSelectFolder = async (): Promise<void> => {
    try {
      const selectedPath = await window.api.dialog.showDirectoryPicker()
      if (selectedPath) setEditedDownloadPath(selectedPath)
    } catch (err) {
      console.error('Error selecting folder:', err)
      setLocalError('Failed to select folder')
    }
  }

  const handleDownloadUnitChange = (newUnit: string): void => {
    if (!downloadSpeedInput.trim()) { setDownloadSpeedUnit(newUnit); return }
    const currentValue = parseFloat(downloadSpeedInput)
    if (isNaN(currentValue)) { setDownloadSpeedUnit(newUnit); return }
    const currentUnitValue = SPEED_UNITS.find((u) => u.value === downloadSpeedUnit)
    const newUnitValue = SPEED_UNITS.find((u) => u.value === newUnit)
    if (!currentUnitValue || !newUnitValue) { setDownloadSpeedUnit(newUnit); return }
    if (originalDownloadKbps.current === null) {
      originalDownloadKbps.current = downloadSpeedUnit === 'kbps'
        ? currentValue
        : currentValue * currentUnitValue.factor
    }
    if (originalDownloadKbps.current !== null) {
      const valueInNewUnit = originalDownloadKbps.current / newUnitValue.factor
      let formatted = newUnit === 'mbps'
        ? valueInNewUnit.toFixed(2).replace(/\.?0+$/, '').replace(/\.$/, '')
        : Math.round(valueInNewUnit).toString()
      setDownloadSpeedInput(formatted)
    }
    setDownloadSpeedUnit(newUnit)
  }

  const handleUploadUnitChange = (newUnit: string): void => {
    if (!uploadSpeedInput.trim()) { setUploadSpeedUnit(newUnit); return }
    const currentValue = parseFloat(uploadSpeedInput)
    if (isNaN(currentValue)) { setUploadSpeedUnit(newUnit); return }
    const currentUnitValue = SPEED_UNITS.find((u) => u.value === uploadSpeedUnit)
    const newUnitValue = SPEED_UNITS.find((u) => u.value === newUnit)
    if (!currentUnitValue || !newUnitValue) { setUploadSpeedUnit(newUnit); return }
    if (originalUploadKbps.current === null) {
      originalUploadKbps.current = uploadSpeedUnit === 'kbps'
        ? currentValue
        : currentValue * currentUnitValue.factor
    }
    if (originalUploadKbps.current !== null) {
      const valueInNewUnit = originalUploadKbps.current / newUnitValue.factor
      let formatted = newUnit === 'mbps'
        ? valueInNewUnit.toFixed(2).replace(/\.?0+$/, '').replace(/\.$/, '')
        : Math.round(valueInNewUnit).toString()
      setUploadSpeedInput(formatted)
    }
    setUploadSpeedUnit(newUnit)
  }

  const handleDownloadInputChange = (value: string): void => {
    setDownloadSpeedInput(value.replace(/[^0-9.]/g, ''))
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      const factor = SPEED_UNITS.find((u) => u.value === downloadSpeedUnit)?.factor || 1
      originalDownloadKbps.current = downloadSpeedUnit === 'kbps' ? numValue : numValue * factor
    } else if (value.trim() === '') {
      originalDownloadKbps.current = null
    }
  }

  const handleUploadInputChange = (value: string): void => {
    setUploadSpeedInput(value.replace(/[^0-9.]/g, ''))
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      const factor = SPEED_UNITS.find((u) => u.value === uploadSpeedUnit)?.factor || 1
      originalUploadKbps.current = uploadSpeedUnit === 'kbps' ? numValue : numValue * factor
    } else if (value.trim() === '') {
      originalUploadKbps.current = null
    }
  }

  const sectionClasses = {
    base: 'w-full',
    heading: 'px-0 py-0',
    trigger: 'px-4 py-3 rounded-large data-[hover=true]:bg-default-100 transition-colors',
    title: 'text-sm font-semibold text-default-800',
    content: 'px-4 pb-4 pt-1'
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        padding: '28px 36px 36px',
        backgroundColor: 'var(--quest-bg)',
        boxSizing: 'border-box',
        color: 'var(--quest-text)'
      }}
    >
      <div style={{ width: '100%', maxWidth: '880px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '8px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--quest-text)', marginBottom: '4px' }}>
            Settings
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--quest-text-muted)' }}>
            Configure preferences and manage your downloads.{appVersion && ` · v${appVersion}`}
          </p>
        </div>

        {isLoading && (
          <p style={{ fontSize: '13px', color: 'var(--quest-text-muted)' }}>
            {t('loadingSettings')}
          </p>
        )}

        {/* Collapsible sections */}
        <Accordion
          selectionMode="multiple"
          defaultExpandedKeys={['appearance']}
          className="gap-2 flex flex-col"
          itemClasses={sectionClasses}
        >

          {/* 1. Appearance & extras */}
          <AccordionItem key="appearance" title="Appearance & extras">
            <Card shadow="none" className="border border-default-100 bg-content1">
              <CardBody className="p-4">
                <ExtraSystemsSettings />
              </CardBody>
            </Card>
          </AccordionItem>

          {/* 2. Multiplayer identity */}
          <AccordionItem key="identity" title="Multiplayer identity">
            <Card shadow="none" className="border border-default-100 bg-content1">
              <CardBody className="p-4">
                <MpUsernameSettings />
              </CardBody>
            </Card>
          </AccordionItem>

          {/* 3. Log upload */}
          <AccordionItem key="logs" title="Log upload">
            <Card shadow="none" className="border border-default-100 bg-content1">
              <CardBody className="p-4">
                <LogUploadSettings />
              </CardBody>
            </Card>
          </AccordionItem>

          {/* 4. Downloads & speed */}
          <AccordionItem key="downloads" title="Downloads & speed">
            <Card shadow="none" className="border border-default-100 bg-content1">
              <CardBody className="p-4">
                <div className="flex flex-col gap-5">
                  <p className="text-sm text-default-500">{t('downloadSettingsDesc')}</p>

                  {/* Download path */}
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-default-800">Download path</span>
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedDownloadPath}
                        onValueChange={setEditedDownloadPath}
                        placeholder={t('downloadPath')}
                        size="sm"
                        className="flex-1"
                        endContent={
                          <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={handleSelectFolder}
                            aria-label={t('browseFolders')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.19a2 2 0 0 1 1.345.513l.905.838A1 1 0 0 0 8.5 2.5h4a2 2 0 0 1 2 2V8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V3.87z"/>
                              <path d="M14.5 10h-13a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/>
                            </svg>
                          </Button>
                        }
                      />
                      <Button color="primary" size="sm" onPress={handleSaveDownloadPath}>
                        {t('savePath')}
                      </Button>
                    </div>
                  </div>

                  <Divider className="opacity-40" />

                  {/* Speed limits */}
                  <div className="flex flex-col gap-3">
                    <span className="text-sm font-medium text-default-800">Speed limits</span>
                    <p className="text-xs text-default-400">{t('unlimitedHint')}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Download speed */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-default-500 font-medium">Download</span>
                        <div className="flex items-center gap-2">
                          <Input
                            value={downloadSpeedInput}
                            onValueChange={handleDownloadInputChange}
                            placeholder={t('unlimited')}
                            size="sm"
                            className="flex-1"
                            endContent={
                              downloadSpeedInput.trim() === '' ? (
                                <Chip size="sm" variant="flat" color="default" className="text-xs shrink-0">∞</Chip>
                              ) : null
                            }
                          />
                          <Select
                            selectedKeys={[downloadSpeedUnit]}
                            onSelectionChange={(keys) => {
                              const k = Array.from(keys)[0] as string
                              if (k) handleDownloadUnitChange(k)
                            }}
                            size="sm"
                            className="w-24 shrink-0"
                            aria-label="Download speed unit"
                          >
                            {SPEED_UNITS.map((u) => (
                              <SelectItem key={u.value}>{u.label}</SelectItem>
                            ))}
                          </Select>
                        </div>
                      </div>

                      {/* Upload speed */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-default-500 font-medium">Upload</span>
                        <div className="flex items-center gap-2">
                          <Input
                            value={uploadSpeedInput}
                            onValueChange={handleUploadInputChange}
                            placeholder={t('unlimited')}
                            size="sm"
                            className="flex-1"
                            endContent={
                              uploadSpeedInput.trim() === '' ? (
                                <Chip size="sm" variant="flat" color="default" className="text-xs shrink-0">∞</Chip>
                              ) : null
                            }
                          />
                          <Select
                            selectedKeys={[uploadSpeedUnit]}
                            onSelectionChange={(keys) => {
                              const k = Array.from(keys)[0] as string
                              if (k) handleUploadUnitChange(k)
                            }}
                            size="sm"
                            className="w-24 shrink-0"
                            aria-label="Upload speed unit"
                          >
                            {SPEED_UNITS.map((u) => (
                              <SelectItem key={u.value}>{u.label}</SelectItem>
                            ))}
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button color="primary" size="sm" onPress={handleSaveSpeedLimits}>
                        {t('saveSpeedLimits')}
                      </Button>
                    </div>
                  </div>

                  {(error || localError) && (
                    <p className="text-danger text-sm">{error || localError}</p>
                  )}
                  {saveSuccess && (
                    <p className="text-success text-sm">{t('settingsSaved')}</p>
                  )}

                  <Divider className="opacity-40" />

                  {/* Server config */}
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-default-800">Server configuration</span>
                    <ServerConfigSettings />
                  </div>
                </div>
              </CardBody>
            </Card>
          </AccordionItem>

          {/* 5. Game blacklist */}
          <AccordionItem key="blacklist" title="Game blacklist">
            <Card shadow="none" className="border border-default-100 bg-content1">
              <CardBody className="p-4">
                <BlacklistSettings />
              </CardBody>
            </Card>
          </AccordionItem>

          {/* 6. Content filter */}
          <AccordionItem key="content" title="Content filter">
            <Card shadow="none" className="border border-default-100 bg-content1">
              <CardBody className="p-4">
                <SwitchRow
                  label="Hide adult content"
                  description="Filters explicit-tagged titles from the library. Requires a game refresh to take effect."
                  checked={hideAdultContent}
                  onChange={(v) => {
                    setHideAdultContentLocal(v)
                    try { localStorage.setItem('vrcyberdeck:hideAdult', String(v)) } catch { }
                  }}
                />
              </CardBody>
            </Card>
          </AccordionItem>

        </Accordion>

        {/* Credits footer */}
        <div className="credits-settings-footer">
          <div className="credits-settings-label">For the VR community</div>
          <div>
            <span className="credits-settings-main">Made with ♥ by DMP of Armgddn Games</span>
            <button
              className="credits-settings-question-btn"
              onClick={() => setIsCreditsOpen(true)}
              title="Credits & Special Thanks"
            >
              ?
            </button>
          </div>
        </div>

      </div>

      <CreditsDialog
        open={isCreditsOpen}
        onClose={() => setIsCreditsOpen(false)}
        variant="settings"
      />
    </div>
  )
}

export default Settings
