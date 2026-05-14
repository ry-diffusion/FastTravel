import React, { useState, useEffect, useRef } from 'react'
import { Folder, HelpCircle, Play, Volume2 } from 'lucide-react'

import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Separator } from './ui/separator'
import { Slider } from './ui/slider'
import { Switch } from './ui/switch'

import { useSettings } from '../hooks/useSettings'
import { useGames } from '../hooks/useGames'
import { useLogs } from '../hooks/useLogs'
import { useLanguage } from '../hooks/useLanguage'
import { useAdb } from '../hooks/useAdb'
import {
  useExtrasSettings,
  FONT_FAMILY_OPTIONS,
  FontFamilyChoice
} from '../hooks/useExtrasSettings'
import { useSoundEffects, SOUND_NAMES, SoundName } from '../hooks/useSoundEffects'

import CreditsDialog from './CreditsDialog'
import ServerConfigSettings from './ServerConfigSettings'

// ─── Constants ────────────────────────────────────────────────────────────────

const SPEED_UNITS = [
  { label: 'KB/s', value: 'kbps', factor: 1 },
  { label: 'MB/s', value: 'mbps', factor: 1024 }
]

// ─── Shared primitives ────────────────────────────────────────────────────────

interface SwitchRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  id?: string
}

const SwitchRow: React.FC<SwitchRowProps> = ({ label, description, checked, onChange, disabled, id }) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      <Label htmlFor={id} className="text-sm font-medium leading-none cursor-pointer">
        {label}
      </Label>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
    </div>
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      className="shrink-0 mt-0.5"
    />
  </div>
)

// ─── Section: Appearance ──────────────────────────────────────────────────────

const AppearanceSection: React.FC = () => {
  const {
    disableAutoUpdate,
    setDisableAutoUpdate,
    fontScale,
    setFontScale,
    deleteOnRemove,
    setDeleteOnRemove,
    disableSideloading,
    setDisableSideloading,
    colorblindMode,
    setColorblindMode,
    accentColor,
    setAccentColor,
    fontFamily,
    setFontFamily
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
  const fontFamilyKeys = Object.keys(FONT_FAMILY_OPTIONS) as FontFamilyChoice[]
  const selectedFontOpt = FONT_FAMILY_OPTIONS[fontFamily]

  return (
    <div className="space-y-5">
      {/* Disable auto-update */}
      <SwitchRow
        id="disable-auto-update"
        label="Disable auto-update check on launch"
        description="Prevents the app from checking GitHub for updates when it starts. You can still update manually."
        checked={disableAutoUpdate}
        onChange={setDisableAutoUpdate}
      />
      <Separator className="opacity-40" />

      {/* Disable sideloading */}
      <SwitchRow
        id="disable-sideloading"
        label="Disable sideloading"
        description="Hides all Install / Uninstall / Reinstall / Update buttons. Downloads still work. Useful for sharing the app without install access."
        checked={disableSideloading}
        onChange={setDisableSideloading}
      />
      <Separator className="opacity-40" />

      {/* Colorblind mode */}
      <SwitchRow
        id="colorblind-mode"
        label="Colorblind mode"
        description="Improves contrast for red-green color vision deficiency. Takes effect immediately."
        checked={colorblindMode}
        onChange={setColorblindMode}
      />
      <Separator className="opacity-40" />

      {/* Accent color */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Accent color</Label>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="color"
            value={accentColor ?? '#3D7DFF'}
            onChange={(e) => setAccentColor(e.target.value)}
            aria-label="Pick accent color"
            className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
          />
          <Badge variant="secondary" className="font-mono text-xs">
            {accentColor ?? '#3D7DFF'}
          </Badge>
          {accentColor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAccentColor(null)}
            >
              Reset to default
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Changes the accent color across the whole UI. Takes effect immediately.
        </p>
      </div>
      <Separator className="opacity-40" />

      {/* Interface font */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Interface font</Label>
        <Select
          value={fontFamily}
          onValueChange={(k) => setFontFamily(k as FontFamilyChoice)}
        >
          <SelectTrigger className="max-w-[260px]" aria-label="Select font family">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontFamilyKeys.map((key) => (
              <SelectItem key={key} value={key}>
                {FONT_FAMILY_OPTIONS[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedFontOpt && (
          <p
            className="text-sm text-muted-foreground"
            style={{ fontFamily: selectedFontOpt.stack }}
          >
            The quick brown fox — {selectedFontOpt.hint}
          </p>
        )}
      </div>
      <Separator className="opacity-40" />

      {/* UI zoom */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">UI zoom</Label>
          <Badge variant="secondary">{Math.round(fontScale * 100)}%</Badge>
        </div>
        <Slider
          min={0.75}
          max={2.0}
          step={0.05}
          value={[fontScale]}
          onValueChange={([v]) => setFontScale(v)}
          className="max-w-md"
          aria-label="UI zoom"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1 max-w-md">
          <span>75%</span>
          <span>100%</span>
          <span>125%</span>
          <span>150%</span>
          <span>200%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Scales the entire UI via Electron zoom. Takes effect immediately.
        </p>
      </div>
      <Separator className="opacity-40" />

      {/* Sound effects */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <Label htmlFor="sound-effects" className="text-sm font-medium leading-none cursor-pointer">
              Sound effects
            </Label>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {anySoundLoaded
                ? 'Plays on button clicks, boot intro typing, and ADB shell matrix load.'
                : 'No sound files found. Drop click.wav, type.wav, or matrix.wav into your sounds/ folder.'}
            </p>
          </div>
          <Switch
            id="sound-effects"
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
            className="shrink-0 mt-0.5"
            aria-label="Enable sound effects"
          />
        </div>

        {/* Volume row */}
        <div className="flex items-center gap-3">
          <Volume2 size={14} className="text-muted-foreground shrink-0" />
          <Slider
            min={0}
            max={100}
            step={1}
            value={[Math.round(soundVolume * 100)]}
            onValueChange={([v]) => setSoundVolume(v / 100)}
            disabled={!soundEnabled}
            className="flex-1"
            aria-label="Sound volume"
          />
          <span className="text-xs text-muted-foreground w-9 text-right shrink-0">
            {Math.round(soundVolume * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!soundEnabled || !soundLoaded.click}
            onClick={() => playSfx('click')}
          >
            <Play size={12} className="mr-1" />
            Test
          </Button>
        </div>

        {/* Per-sound rows */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Available sounds</p>
          {SOUND_NAMES.map((name: SoundName) => {
            const isLoaded = !!soundLoaded[name]
            const isEnabled = soundPerName[name] !== false
            return (
              <div key={name} className="flex items-center gap-3">
                <Switch
                  checked={isEnabled && soundEnabled && isLoaded}
                  onCheckedChange={(v) => setSoundPerName(name, v)}
                  disabled={!soundEnabled || !isLoaded}
                  aria-label={`Enable ${name} sound`}
                  className="shrink-0"
                />
                <span
                  className={`text-xs flex-1 ${
                    isLoaded
                      ? isEnabled
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                      : 'text-destructive'
                  }`}
                >
                  {name}
                </span>
                <Badge
                  variant={
                    isLoaded
                      ? isEnabled && soundEnabled
                        ? 'secondary'
                        : 'outline'
                      : 'destructive'
                  }
                  className="text-xs"
                >
                  {isLoaded ? (isEnabled ? 'enabled' : 'disabled') : 'missing'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!soundEnabled || !isLoaded}
                  onClick={() => playSfx(name)}
                  aria-label={`Play ${name}`}
                  className="h-7 w-7"
                >
                  <Play size={12} />
                </Button>
              </div>
            )
          })}
        </div>
      </div>
      <Separator className="opacity-40" />

      {/* Transfer list remove behavior */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Transfer list — remove behavior</Label>
        <p className="text-xs text-muted-foreground">
          What happens to files when removing a completed or errored item from the transfer list.
        </p>
        <Select
          value={deleteOnRemove}
          onValueChange={(k) => setDeleteOnRemove(k as 'ask' | 'keep' | 'delete')}
        >
          <SelectTrigger className="max-w-[220px]" aria-label="Remove behavior">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ask">Ask each time</SelectItem>
            <SelectItem value="keep">Keep files</SelectItem>
            <SelectItem value="delete">Delete files</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// ─── Section: Downloads & speed ───────────────────────────────────────────────

const DownloadsSection: React.FC = () => {
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

  const { t } = useLanguage()

  const [editedDownloadPath, setEditedDownloadPath] = useState(downloadPath)
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

  const [maxConcurrent, setMaxConcurrentState] = useState<number>(3)
  const [existingDlAction, setExistingDlActionState] = useState<'ask' | 'reinstall' | 'redownload'>('ask')
  const [limitExtractionThreads, setLimitExtractionThreadsState] = useState<boolean>(true)

  const [localError, setLocalError] = useState<string | null>(null)
  const [savePathSuccess, setSavePathSuccess] = useState(false)
  const [saveSpeedSuccess, setSaveSpeedSuccess] = useState(false)

  const totalCpuThreads = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 0 : 0
  const limitedThreadCount = Math.max(1, Math.floor(totalCpuThreads / 3))

  useEffect(() => {
    window.api.settings.getMaxConcurrentDownloads().then(setMaxConcurrentState).catch(() => {})
  }, [])

  useEffect(() => {
    window.api.settings.getExistingDownloadAction().then(setExistingDlActionState).catch(() => {})
  }, [])

  useEffect(() => {
    window.api.settings.getLimitExtractionThreads().then(setLimitExtractionThreadsState).catch(() => {})
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

  const handleSetMaxConcurrent = (n: number): void => {
    setMaxConcurrentState(n)
    window.api.settings.setMaxConcurrentDownloads(n).catch(() => {})
  }

  const handleSetExistingDlAction = (v: 'ask' | 'reinstall' | 'redownload'): void => {
    setExistingDlActionState(v)
    window.api.settings.setExistingDownloadAction(v).catch(() => {})
  }

  const handleSetLimitExtractionThreads = (v: boolean): void => {
    setLimitExtractionThreadsState(v)
    window.api.settings.setLimitExtractionThreads(v).catch(() => {})
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

  const handleSaveDownloadPath = async (): Promise<void> => {
    if (!editedDownloadPath) {
      setLocalError(t('downloadPathEmpty'))
      return
    }
    try {
      setLocalError(null)
      setSavePathSuccess(false)
      await setDownloadPath(editedDownloadPath)
      setSavePathSuccess(true)
      setTimeout(() => setSavePathSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving download path:', err)
      setLocalError(t('failedToSavePath'))
    }
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

  const handleDownloadUnitChange = (newUnit: string): void => {
    if (!downloadSpeedInput.trim()) { setDownloadSpeedUnit(newUnit); return }
    const currentValue = parseFloat(downloadSpeedInput)
    if (isNaN(currentValue)) { setDownloadSpeedUnit(newUnit); return }
    const currentUnitValue = SPEED_UNITS.find((u) => u.value === downloadSpeedUnit)
    const newUnitValue = SPEED_UNITS.find((u) => u.value === newUnit)
    if (!currentUnitValue || !newUnitValue) { setDownloadSpeedUnit(newUnit); return }
    if (originalDownloadKbps.current === null) {
      originalDownloadKbps.current = downloadSpeedUnit === 'kbps' ? currentValue : currentValue * currentUnitValue.factor
    }
    if (originalDownloadKbps.current !== null) {
      const valueInNewUnit = originalDownloadKbps.current / newUnitValue.factor
      const formatted = newUnit === 'mbps'
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
      originalUploadKbps.current = uploadSpeedUnit === 'kbps' ? currentValue : currentValue * currentUnitValue.factor
    }
    if (originalUploadKbps.current !== null) {
      const valueInNewUnit = originalUploadKbps.current / newUnitValue.factor
      const formatted = newUnit === 'mbps'
        ? valueInNewUnit.toFixed(2).replace(/\.?0+$/, '').replace(/\.$/, '')
        : Math.round(valueInNewUnit).toString()
      setUploadSpeedInput(formatted)
    }
    setUploadSpeedUnit(newUnit)
  }

  const handleSaveSpeedLimits = async (): Promise<void> => {
    try {
      setLocalError(null)
      setSaveSpeedSuccess(false)

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

      setSaveSpeedSuccess(true)
      setTimeout(() => setSaveSpeedSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving speed limits:', err)
      setLocalError(t('failedToSaveSpeed'))
    }
  }

  return (
    <div className="space-y-5">
      {isLoading && (
        <p className="text-sm text-muted-foreground">{t('loadingSettings')}</p>
      )}

      <p className="text-sm text-muted-foreground">{t('downloadSettingsDesc')}</p>

      {/* Download path */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Download path</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={editedDownloadPath}
              onChange={(e) => setEditedDownloadPath(e.target.value)}
              placeholder={t('downloadPath')}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSelectFolder}
              aria-label={t('browseFolders')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <Folder size={14} />
            </Button>
          </div>
          <Button onClick={handleSaveDownloadPath}>{t('savePath')}</Button>
        </div>
        {savePathSuccess && (
          <p className="text-xs text-emerald-500">{t('settingsSaved')}</p>
        )}
      </div>

      <Separator className="opacity-40" />

      {/* Concurrent downloads */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Concurrent downloads</Label>
        <p className="text-xs text-muted-foreground">
          Number of games that download simultaneously. Takes effect on the next queue item.
        </p>
        <Select
          value={String(maxConcurrent)}
          onValueChange={(k) => handleSetMaxConcurrent(Number(k))}
        >
          <SelectTrigger className="w-[120px]" aria-label="Concurrent downloads">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {String(n)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="opacity-40" />

      {/* Extraction thread limit */}
      <SwitchRow
        id="limit-extraction-threads"
        label={`Limit extraction threads${totalCpuThreads ? ` (~${limitedThreadCount} of ${totalCpuThreads})` : ''}`}
        description="Caps 7-zip to ~1/3 of your CPU threads so archive extraction doesn't pin every core and stall the UI. Disable to let 7-zip use all available threads."
        checked={limitExtractionThreads}
        onChange={handleSetLimitExtractionThreads}
      />

      <Separator className="opacity-40" />

      {/* When download already exists */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">When download already exists on disk</Label>
        <p className="text-xs text-muted-foreground leading-relaxed">
          When you click Download for a game whose folder already exists in your downloads path — from a previous run, another tool, or a cleared queue.
        </p>
        <Select
          value={existingDlAction}
          onValueChange={(k) => handleSetExistingDlAction(k as 'ask' | 'reinstall' | 'redownload')}
        >
          <SelectTrigger className="max-w-[280px]" aria-label="Existing download action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ask">Ask me each time</SelectItem>
            <SelectItem value="reinstall">Install from existing</SelectItem>
            <SelectItem value="redownload">Re-download</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator className="opacity-40" />

      {/* Speed limits */}
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Speed limits</Label>
        <p className="text-xs text-muted-foreground">{t('unlimitedHint')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Download speed */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Download</span>
            <div className="flex items-center gap-2">
              <Input
                value={downloadSpeedInput}
                onChange={(e) => handleDownloadInputChange(e.target.value)}
                placeholder={t('unlimited')}
                className="flex-1"
              />
              <Select
                value={downloadSpeedUnit}
                onValueChange={handleDownloadUnitChange}
              >
                <SelectTrigger className="w-24 shrink-0" aria-label="Download speed unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPEED_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload speed */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Upload</span>
            <div className="flex items-center gap-2">
              <Input
                value={uploadSpeedInput}
                onChange={(e) => handleUploadInputChange(e.target.value)}
                placeholder={t('unlimited')}
                className="flex-1"
              />
              <Select
                value={uploadSpeedUnit}
                onValueChange={handleUploadUnitChange}
              >
                <SelectTrigger className="w-24 shrink-0" aria-label="Upload speed unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPEED_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSaveSpeedLimits}>{t('saveSpeedLimits')}</Button>
        </div>
        {saveSpeedSuccess && (
          <p className="text-xs text-emerald-500">{t('settingsSaved')}</p>
        )}
      </div>

      {(error || localError) && (
        <p className="text-sm text-destructive">{error || localError}</p>
      )}

      <Separator className="opacity-40" />

      {/* Server configuration */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Server configuration</Label>
        <ServerConfigSettings />
      </div>
    </div>
  )
}

// ─── Section: Multiplayer identity ───────────────────────────────────────────

const MultiplayerSection: React.FC = () => {
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
      <p className="text-sm text-muted-foreground">Your display name in VR multiplayer games.</p>
      {!isConnected && (
        <Badge variant="secondary" className="w-fit">
          Connect a device to change your username
        </Badge>
      )}
      <div className="flex items-center gap-2 max-w-sm">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="Enter VR display name"
          disabled={!isConnected}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleSave() }}
          className="flex-1"
        />
        <Button
          onClick={handleSave}
          disabled={loadingUserName || !editValue.trim() || !isConnected}
        >
          Save
        </Button>
      </div>
      {saved && <p className="text-xs text-emerald-500">Username saved.</p>}
    </div>
  )
}

// ─── Section: Log upload ──────────────────────────────────────────────────────

const LogUploadSection: React.FC = () => {
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
    if (slug) void navigator.clipboard.writeText(slug)
  }

  const handleCopyUrl = (): void => {
    if (shareableUrl) void navigator.clipboard.writeText(shareableUrl)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t('logUploadDesc')}</p>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void openLogFolder()}>
          Open log folder
        </Button>
        <Button variant="outline" size="sm" onClick={() => void openLogFile()}>
          Open log file
        </Button>
        <Button
          size="sm"
          disabled={isUploading}
          onClick={handleUploadLog}
        >
          {isUploading ? t('uploading_log') : t('uploadCurrentLog')}
        </Button>
      </div>

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      {uploadSuccess && shareableUrl && (
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-3 flex flex-col gap-3">
            <p className="text-sm font-medium text-emerald-500">{t('logUploadSuccess')}</p>

            {slug && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">{t('rentryCode')}</span>
                <div className="flex items-center gap-2">
                  <Input
                    value={slug}
                    readOnly
                    className="max-w-[220px] font-mono text-base font-bold"
                  />
                  <Button size="sm" onClick={handleCopySlug}>{t('copyCode')}</Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('rentryCodeHint')}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{t('url')}</span>
              <div className="flex items-center gap-2">
                <Input value={shareableUrl} readOnly className="flex-1 text-xs" />
                <Button size="sm" variant="outline" onClick={handleCopyUrl}>{t('copyUrl')}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">{t('logUploadHint')}</p>
    </div>
  )
}

// ─── Section: Game blacklist ──────────────────────────────────────────────────

interface BlacklistEntry {
  packageName: string
  version: number | 'any'
}

const GameBlacklistSection: React.FC = () => {
  const { t } = useLanguage()
  const { getBlacklistGames, removeGameFromBlacklist } = useGames()
  const [blacklistGames, setBlacklistGames] = useState<BlacklistEntry[]>([])
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [removeSuccess, setRemoveSuccess] = useState(false)

  const loadBlacklistGames = async (): Promise<void> => {
    try {
      setIsLoadingList(true)
      setListError(null)
      const games = await getBlacklistGames()
      setBlacklistGames(games)
    } catch (err) {
      console.error('Error loading blacklisted games:', err)
      setListError('Failed to load blacklisted games')
    } finally {
      setIsLoadingList(false)
    }
  }

  useEffect(() => {
    void loadBlacklistGames()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRemoveFromBlacklist = async (packageName: string): Promise<void> => {
    try {
      setListError(null)
      await removeGameFromBlacklist(packageName)
      await loadBlacklistGames()
      setRemoveSuccess(true)
      setTimeout(() => setRemoveSuccess(false), 3000)
    } catch (err) {
      console.error('Error removing game from blacklist:', err)
      setListError(t('blacklistRemoveError'))
    }
  }

  if (isLoadingList) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-sm text-muted-foreground">{t('loadingBlacklist')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t('blacklistedGamesDesc')}</p>

      {blacklistGames.length === 0 ? (
        <div className="flex justify-center items-center py-8 text-muted-foreground text-sm">
          {t('noBlacklistedGames')}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {blacklistGames.map((game) => (
            <div
              key={`${game.packageName}-${game.version}`}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md bg-muted/50"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate">{game.packageName}</span>
                <span className="text-xs text-muted-foreground">
                  {game.version === 'any' ? t('allVersions') : `v${game.version}`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleRemoveFromBlacklist(game.packageName)}
                aria-label={t('remove')}
                className="text-destructive hover:text-destructive shrink-0"
              >
                {t('remove')}
              </Button>
            </div>
          ))}
        </div>
      )}

      {listError && <p className="text-sm text-destructive">{listError}</p>}
      {removeSuccess && (
        <p className="text-xs text-emerald-500">{t('blacklistRemoveSuccess')}</p>
      )}
    </div>
  )
}

// ─── Section: Content filter ──────────────────────────────────────────────────

const ContentFilterSection: React.FC = () => {
  const [hideAdultContent, setHideAdultContentLocal] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vrcyberdeck:hideAdult') !== 'false'
    } catch {
      return true
    }
  })

  return (
    <SwitchRow
      id="hide-adult-content"
      label="Hide adult content"
      description="Filters explicit-tagged titles from the library. Requires a game refresh to take effect."
      checked={hideAdultContent}
      onChange={(v) => {
        setHideAdultContentLocal(v)
        try {
          localStorage.setItem('vrcyberdeck:hideAdult', String(v))
        } catch {
          /* ignore */
        }
      }}
    />
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

const Settings: React.FC = () => {
  const [appVersion, setAppVersion] = useState<string>('')
  const [isCreditsOpen, setIsCreditsOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    const p = window.api.app?.getVersion?.()
    if (p)
      p.then((v) => {
        if (mounted) setAppVersion(v)
      }).catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      {/* Page header */}
      <div className="px-8 py-6 max-w-[1280px] w-full mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure preferences and manage your downloads.
          {appVersion && ` · v${appVersion}`}
        </p>
      </div>

      {/* Section grid */}
      <div className="px-8 pb-8 max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Appearance — full width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <AppearanceSection />
          </CardContent>
        </Card>

        {/* Downloads & speed — full width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Downloads & speed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <DownloadsSection />
          </CardContent>
        </Card>

        {/* Multiplayer identity — 1 col */}
        <Card>
          <CardHeader>
            <CardTitle>Multiplayer identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <MultiplayerSection />
          </CardContent>
        </Card>

        {/* Log upload — 1 col */}
        <Card>
          <CardHeader>
            <CardTitle>Log upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <LogUploadSection />
          </CardContent>
        </Card>

        {/* Game blacklist — 1 col */}
        <Card>
          <CardHeader>
            <CardTitle>Game blacklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <GameBlacklistSection />
          </CardContent>
        </Card>

        {/* Content filter — 1 col */}
        <Card>
          <CardHeader>
            <CardTitle>Content filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ContentFilterSection />
          </CardContent>
        </Card>

        {/* Credits footer — full width */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4 flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">For the VR community</span>
              <span className="text-sm font-medium">Made with ♥ by DMP of Armgddn Games</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Credits"
              onClick={() => setIsCreditsOpen(true)}
            >
              <HelpCircle size={16} />
            </Button>
          </CardContent>
        </Card>
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
