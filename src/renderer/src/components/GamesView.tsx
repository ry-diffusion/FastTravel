import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  FilterFn,
  ColumnFiltersState,
  Row,
  ColumnSizingState
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Button,
  Spinner,
  Progress,
  Chip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
  Divider,
  Switch,
  Card,
  CardBody,
  Image
} from '@heroui/react'
import {
  Search,
  LayoutGrid,
  Table2,
  MoreHorizontal,
  SlidersHorizontal,
  BatteryMedium,
  LogOut,
  RefreshCw,
  Terminal,
  Globe,
  Upload,
  FolderPlus,
  Check,
  X,
  LibraryBig,
  ArrowUpDown,
  Settings,
  ArrowDownToLine
} from 'lucide-react'
import { useAdb } from '../hooks/useAdb'
import { useGames } from '../hooks/useGames'
import { useDownload } from '../hooks/useDownload'
import { useLanguage } from '../hooks/useLanguage'
import { GameInfo } from '@shared/types'
import placeholderImage from '../assets/images/game-placeholder.png'
import GameDetailsDialog from './GameDetailsDialog'
import { useGameDialog } from '@renderer/hooks/useGameDialog'
import MirrorManagement from './MirrorManagement'
import LocalUploadDialog from './LocalUploadDialog'
import UploadGamesDialog from './UploadGamesDialog'
import { AdbShellDialog } from './AdbShellDialog'
import { useTablePreferences } from '@renderer/hooks/useTablePreferences'
import { useSettings } from '../hooks/useSettings'
import { useMirrors } from '../hooks/useMirrors'
import { TranslationKey } from '../i18n/translations'

// ─── Column width constants ──────────────────────────────────────────────────
const COLUMN_WIDTHS = {
  STATUS: 60,
  THUMBNAIL: 90,
  VERSION: 180,
  POPULARITY: 120,
  SIZE: 90,
  LAST_UPDATED: 180,
  MIN_NAME_PACKAGE: 300
}

const FIXED_COLUMNS_WIDTH =
  COLUMN_WIDTHS.STATUS +
  COLUMN_WIDTHS.THUMBNAIL +
  COLUMN_WIDTHS.VERSION +
  COLUMN_WIDTHS.POPULARITY +
  COLUMN_WIDTHS.SIZE +
  COLUMN_WIDTHS.LAST_UPDATED

type FilterType = 'all' | 'installed' | 'update'
type CategoryFilter = 'all' | 'adult' | 'non-adult'

const CATEGORY_FILTER_KEY = 'vrcyberdeck:categoryFilter'

const isAdultGame = (name: string | undefined): boolean =>
  String(name ?? '').includes('18+')

const readCategoryFilter = (): CategoryFilter => {
  try {
    const v = localStorage.getItem(CATEGORY_FILTER_KEY)
    if (v === 'all' || v === 'adult' || v === 'non-adult') return v
  } catch {
    /* ignore */
  }
  return 'all'
}

const parseSizeBytes = (s: string): number => {
  if (!s) return 0
  const m = s.match(/([0-9.]+)\s*(GB|MB|KB|B)?/i)
  if (!m) return 0
  const n = parseFloat(m[1])
  const u = (m[2] ?? 'B').toUpperCase()
  return n * ({ B: 1, KB: 1024, MB: 1048576, GB: 1073741824 }[u] ?? 1)
}

const NEW_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000
const UPDATED_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000
const SNAPSHOT_TRACKING_EPOCH_MS = new Date('2026-04-20T00:00:00Z').getTime()

function getGameBadge(game: GameInfo): 'new' | 'updated' | null {
  const now = Date.now()
  if (
    game.firstSeenAt &&
    game.firstSeenAt > SNAPSHOT_TRACKING_EPOCH_MS &&
    now - game.firstSeenAt <= NEW_THRESHOLD_MS
  ) {
    return 'new'
  }
  if (
    game.versionChangedAt &&
    game.versionChangedAt > SNAPSHOT_TRACKING_EPOCH_MS &&
    now - game.versionChangedAt <= UPDATED_THRESHOLD_MS
  ) {
    return 'updated'
  }
  return null
}

const filterGameNameAndPackage: FilterFn<GameInfo> = (row, _columnId, filterValue) => {
  const searchStr = String(filterValue).toLowerCase()
  const gameName = String(row.original.name ?? '').toLowerCase()
  const packageName = String(row.original.packageName ?? '').toLowerCase()
  const releaseName = String(row.original.releaseName ?? '').toLowerCase()
  return (
    gameName.includes(searchStr) ||
    packageName.includes(searchStr) ||
    releaseName.includes(searchStr)
  )
}

declare module '@tanstack/react-table' {
  interface FilterFns {
    gameNameAndPackageFilter: FilterFn<GameInfo>
  }
}

const COLOR_SWATCHES = [
  { label: 'None', value: 'transparent' },
  { label: 'Cyan', value: 'rgba(0, 212, 255, 0.07)' },
  { label: 'Purple', value: 'rgba(176, 64, 255, 0.07)' },
  { label: 'Pink', value: 'rgba(255, 0, 180, 0.06)' },
  { label: 'Green', value: 'rgba(0, 255, 128, 0.07)' },
  { label: 'Blue', value: 'rgba(40, 120, 255, 0.08)' },
  { label: 'Subtle', value: 'rgba(255, 255, 255, 0.05)' }
] as const

function parseStorageGB(s: string | null | undefined): number {
  if (!s) return 0
  const m = s.match(/(\d+(?:\.\d+)?)\s*([GT])/i)
  if (!m) return 0
  return /T/i.test(m[2]) ? parseFloat(m[1]) * 1024 : parseFloat(m[1])
}

// ─── ConnectedDeviceChip ─────────────────────────────────────────────────────
interface ConnectedDeviceChipProps {
  selectedDeviceDetails: {
    friendlyModelName?: string | null
    batteryLevel?: number | null
    storageFree?: string | null
    storageTotal?: string | null
  } | null
  isConnected: boolean
  isBusy: boolean
  onDisconnect: () => void
  onRefreshPackages: () => void
  onAdbShell: () => void
  t: (key: TranslationKey) => string
}

const ConnectedDeviceChip: React.FC<ConnectedDeviceChipProps> = ({
  selectedDeviceDetails,
  isConnected,
  isBusy,
  onDisconnect,
  onRefreshPackages,
  onAdbShell,
  t
}) => {
  if (!selectedDeviceDetails) {
    return (
      <Chip size="sm" variant="flat" color="danger" className="text-xs">
        No device
      </Chip>
    )
  }

  const modelName = selectedDeviceDetails.friendlyModelName || 'Quest'
  const battery = selectedDeviceDetails.batteryLevel
  const batteryColor = battery != null && battery <= 20 ? 'text-danger' : 'text-success'

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Chip
          size="sm"
          variant="flat"
          color="primary"
          className="cursor-pointer text-xs hover:opacity-80 transition-opacity"
        >
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block flex-shrink-0" />
            <span className="font-medium truncate max-w-[140px]">{modelName}</span>
            {battery != null && (
              <span className={`flex items-center gap-0.5 ${batteryColor}`}>
                <BatteryMedium size={12} />
                <span>{battery}%</span>
              </span>
            )}
          </span>
        </Chip>
      </PopoverTrigger>
      <PopoverContent className="p-2 min-w-[180px]">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-default-400 px-2 py-1 font-medium">{modelName}</p>
          <Divider className="my-0.5" />
          {selectedDeviceDetails.storageFree && selectedDeviceDetails.storageTotal && (
            <div className="px-2 py-1">
              <p className="text-xs text-default-400 mb-1">Storage</p>
              <Progress
                size="sm"
                value={parseStorageGB(selectedDeviceDetails.storageFree)}
                maxValue={parseStorageGB(selectedDeviceDetails.storageTotal)}
                color="primary"
                className="max-w-full"
                aria-label="Storage"
              />
              <p className="text-xs text-default-500 mt-1">
                {selectedDeviceDetails.storageFree} free
              </p>
            </div>
          )}
          <Divider className="my-0.5" />
          <button
            className="flex items-center gap-2 text-xs text-default-600 hover:text-default-900 hover:bg-default-100 px-2 py-1.5 rounded-md transition-colors w-full text-left"
            onClick={onRefreshPackages}
            disabled={isBusy}
          >
            <RefreshCw size={12} />
            {t('refreshQuest')}
          </button>
          <button
            className="flex items-center gap-2 text-xs text-default-600 hover:text-default-900 hover:bg-default-100 px-2 py-1.5 rounded-md transition-colors w-full text-left"
            onClick={onAdbShell}
            disabled={!isConnected}
          >
            <Terminal size={12} />
            ADB shell
          </button>
          <Divider className="my-0.5" />
          <button
            className="flex items-center gap-2 text-xs text-danger hover:bg-danger/10 px-2 py-1.5 rounded-md transition-colors w-full text-left"
            onClick={onDisconnect}
          >
            <LogOut size={12} />
            Disconnect
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── GamesView props ─────────────────────────────────────────────────────────
interface GamesViewProps {
  onBackToDevices: () => void
  onTransfers: () => void
  onSettings: () => void
}

const GamesView: React.FC<GamesViewProps> = ({ onBackToDevices, onTransfers, onSettings }) => {
  const {
    selectedDevice,
    selectedDeviceDetails,
    isConnected,
    disconnectDevice,
    isLoading: adbLoading,
    loadPackages
  } = useAdb()
  const {
    games,
    isLoading: loadingGames,
    error: gamesError,
    lastSyncTime,
    downloadProgress,
    extractProgress,
    refreshGames,
    getNote,
    requestUploadCheck
  } = useGames()
  const {
    addToQueue: addDownloadToQueue,
    queue: downloadQueue,
    cancelDownload,
    retryDownload,
    deleteFiles
  } = useDownload()

  const { t } = useLanguage()
  const { serverConfig } = useSettings()
  const { activeMirror } = useMirrors()
  const isUsingVrSrcEndpoint = !activeMirror && serverConfig.baseUri.includes('srcdl1.xyz')

  // ── Dialog/modal state ─────────────────────────────────────────────────────
  const [shellDialogOpen, setShellDialogOpen] = useState(false)
  const [showMirrorMgmt, setShowMirrorMgmt] = useState(false)
  const [showUploadGames, setShowUploadGames] = useState(false)
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false)

  // ── Table preferences & filtering ─────────────────────────────────────────
  const { prefs, setPrefs } = useTablePreferences()
  const [globalFilter, setGlobalFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = String(e.target.value)
    setSearchInput(val)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setGlobalFilter(val), 400)
  }, [])

  const handleSearchClear = useCallback(() => {
    setSearchInput('')
    setGlobalFilter('')
  }, [])

  const [sorting, setSorting] = useState<SortingState>(() =>
    prefs.tableSortKey ? [{ id: prefs.tableSortKey, desc: prefs.tableSortDir === 'desc' }] : []
  )
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [categoryFilter, setCategoryFilterState] = useState<CategoryFilter>(() =>
    readCategoryFilter()
  )
  const setCategoryFilter = useCallback((v: CategoryFilter) => {
    setCategoryFilterState(v)
    try {
      localStorage.setItem(CATEGORY_FILTER_KEY, v)
    } catch {
      /* ignore */
    }
  }, [])

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [dialogGame, setDialogGame] = useGameDialog()
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [tableWidth, setTableWidth] = useState<number>(0)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})

  const [isManualInstalling, setIsManualInstalling] = useState<boolean>(false)
  const [installStatusMessage, setInstallStatusMessage] = useState<string>('')
  const [showInstallDialog, setShowInstallDialog] = useState<boolean>(false)
  const [installSuccess, setInstallSuccess] = useState<boolean | null>(null)
  const [showObbConfirmDialog, setShowObbConfirmDialog] = useState<boolean>(false)
  const [obbFolderToConfirm, setObbFolderToConfirm] = useState<string | null>(null)

  const counts = useMemo(() => {
    const total = games.length
    const installed = games.filter((g) => g.isInstalled).length
    const updates = games.filter((g) => g.hasUpdate).length
    return { total, installed, updates }
  }, [games])

  const activeTransferCount = useMemo(
    () =>
      downloadQueue.filter(
        (d) =>
          d.status === 'Downloading' ||
          d.status === 'Extracting' ||
          d.status === 'Installing' ||
          d.status === 'Queued'
      ).length,
    [downloadQueue]
  )

  // Apply density CSS variables to the table container
  useEffect(() => {
    const el = tableContainerRef.current
    if (!el) return
    const padV = 4 + (prefs.rowDensity / 100) * 12
    const thumb = 48 + (prefs.rowDensity / 100) * 42
    el.style.setProperty('--row-pad-v', `${padV}px`)
    el.style.setProperty('--row-thumb-size', `${Math.round(thumb)}px`)
    el.style.setProperty('--row-even-color', prefs.evenRowColor)
    el.style.setProperty('--row-odd-color', prefs.oddRowColor)
  }, [prefs])

  useEffect(() => {
    setColumnFilters((prev) => {
      const otherFilters = prev.filter((f) => f.id !== 'isInstalled' && f.id !== 'hasUpdate')
      switch (activeFilter) {
        case 'installed':
          return [...otherFilters, { id: 'isInstalled', value: true }]
        case 'update':
          return [
            ...otherFilters,
            { id: 'isInstalled', value: true },
            { id: 'hasUpdate', value: true }
          ]
        case 'all':
        default:
          return otherFilters
      }
    })
  }, [activeFilter])

  useEffect(() => {
    const unsubscribe = window.api.adb.onInstallationCompleted((deviceId) => {
      if (selectedDevice && deviceId === selectedDevice) {
        loadPackages().catch((err) => console.error('[GamesView] Package refresh error:', err))
      }
    })
    return () => {
      unsubscribe()
    }
  }, [selectedDevice, loadPackages])

  const downloadStatusMap = useMemo(() => {
    const map = new Map<
      string,
      {
        status: string
        progress: number
        speed?: string
        eta?: string
        error?: string
        downloadPath?: string
      }
    >()
    downloadQueue.forEach((item) => {
      if (item.releaseName) {
        const progress =
          item.status === 'Extracting' ? (item.extractProgress ?? 0) : (item.progress ?? 0)
        map.set(item.releaseName, {
          status: item.status,
          progress: progress,
          speed: item.speed,
          eta: item.eta,
          error: item.error,
          downloadPath: item.downloadPath
        })
      }
    })
    return map
  }, [downloadQueue])

  const downloadStatusMapRef = useRef(downloadStatusMap)
  downloadStatusMapRef.current = downloadStatusMap

  useEffect(() => {
    if (!tableContainerRef.current) return
    const currentRef = tableContainerRef.current
    const updateTableWidth = (): void => {
      if (tableContainerRef.current) {
        setTableWidth(tableContainerRef.current.clientWidth)
        setColumnSizing({})
      }
    }
    updateTableWidth()
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(updateTableWidth)
    })
    resizeObserver.observe(currentRef)
    return () => {
      resizeObserver.unobserve(currentRef)
    }
  }, [])

  const columns = useMemo<ColumnDef<GameInfo>[]>(() => {
    const nameColumnWidth = Math.max(
      COLUMN_WIDTHS.MIN_NAME_PACKAGE,
      tableWidth - FIXED_COLUMNS_WIDTH - 5
    )

    return [
      {
        id: 'downloadStatus',
        header: '',
        size: COLUMN_WIDTHS.STATUS,
        enableResizing: false,
        enableSorting: false,
        cell: ({ row }) => {
          const game = row.original
          const downloadInfo = game.releaseName
            ? downloadStatusMapRef.current.get(game.releaseName)
            : undefined
          const isInstalled = game.isInstalled
          const isUpdateAvailable = game.hasUpdate
          const isDownloaded = downloadInfo?.status === 'Completed'

          return (
            <div className="flex items-center justify-center h-full gap-1">
              {isInstalled && !isUpdateAvailable && (
                <Chip
                  size="sm"
                  color="success"
                  variant="flat"
                  className="text-xs px-1 py-0 min-w-0 h-5"
                >
                  <Check size={10} />
                </Chip>
              )}
              {isUpdateAvailable && (
                <Chip
                  size="sm"
                  color="warning"
                  variant="flat"
                  className="text-xs px-1 py-0 min-w-0 h-5"
                >
                  <RefreshCw size={10} />
                </Chip>
              )}
              {isDownloaded && !isInstalled && (
                <Chip
                  size="sm"
                  color="default"
                  variant="flat"
                  className="text-xs px-1 py-0 min-w-0 h-5"
                >
                  <Check size={10} />
                </Chip>
              )}
            </div>
          )
        }
      },
      {
        accessorKey: 'thumbnailPath',
        header: ' ',
        size: COLUMN_WIDTHS.THUMBNAIL,
        enableResizing: false,
        cell: ({ getValue }) => {
          const pathValue = getValue()
          const imagePath = typeof pathValue === 'string' ? pathValue : ''
          return (
            <div
              style={{
                width: 'var(--row-thumb-size, 64px)',
                height: 'var(--row-thumb-size, 64px)',
                borderRadius: '6px',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              <img
                src={imagePath ? `file://${imagePath}` : placeholderImage}
                alt="Thumbnail"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )
        },
        enableSorting: false
      },
      {
        accessorKey: 'name',
        header: () => t('namePackage'),
        size: nameColumnWidth > 0 ? nameColumnWidth : COLUMN_WIDTHS.MIN_NAME_PACKAGE,
        sortingFn: (rowA, rowB) => {
          const a = (rowA.original.name ?? '').toLowerCase()
          const b = (rowB.original.name ?? '').toLowerCase()
          for (let i = 0; i < Math.max(a.length, b.length); i++) {
            if (i >= a.length) return -1
            if (i >= b.length) return 1
            const ca = a[i],
              cb = b[i]
            if (ca === cb) continue
            const p = (c: string) => (c === '_' ? 0 : c >= '0' && c <= '9' ? 1 : 2)
            const pa = p(ca),
              pb = p(cb)
            if (pa !== pb) return pa - pb
            return ca < cb ? -1 : 1
          }
          return 0
        },
        cell: ({ row }) => {
          const game = row.original
          const downloadInfo = game.releaseName
            ? downloadStatusMapRef.current.get(game.releaseName)
            : undefined
          const isDownloading = downloadInfo?.status === 'Downloading'
          const isExtracting = downloadInfo?.status === 'Extracting'
          const isQueued = downloadInfo?.status === 'Queued'
          const isInstalling = downloadInfo?.status === 'Installing'
          const isInstallError = downloadInfo?.status === 'InstallError'
          const badge = getGameBadge(game)

          return (
            <div
              className="flex flex-col justify-center h-full relative"
              style={{ paddingBottom: '8px' }}
            >
              <div className="mb-1">
                <div className="text-sm font-medium text-foreground truncate">{game.name}</div>
                <div className="text-xs text-default-400 truncate">{game.releaseName}</div>
                <div className="text-xs text-default-400 truncate">{game.packageName}</div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {badge === 'new' && (
                  <Chip size="sm" color="success" variant="flat" className="text-xs h-4 px-1">
                    New
                  </Chip>
                )}
                {badge === 'updated' && (
                  <Chip size="sm" color="warning" variant="flat" className="text-xs h-4 px-1">
                    Updated
                  </Chip>
                )}
                {isQueued && (
                  <Chip size="sm" color="primary" variant="flat" className="text-xs h-4 px-1">
                    {t('queued')}
                  </Chip>
                )}
                {(isDownloading || isExtracting || isInstalling) && (
                  <div className="flex items-center gap-1">
                    <Spinner size="sm" color="primary" />
                    <Chip
                      size="sm"
                      color="primary"
                      variant="bordered"
                      className="text-xs h-4 px-1"
                    >
                      {downloadInfo?.status}
                      {isDownloading && downloadInfo?.progress != null
                        ? ` ${downloadInfo.progress}%`
                        : ''}
                    </Chip>
                    {isDownloading && downloadInfo?.speed && (
                      <span className="text-xs text-default-400">{downloadInfo.speed}</span>
                    )}
                  </div>
                )}
                {isInstallError && (
                  <Chip size="sm" color="danger" variant="flat" className="text-xs h-4 px-1">
                    {t('installError')}
                  </Chip>
                )}
              </div>
              {(isDownloading || isExtracting || isInstalling) && downloadInfo && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5">
                  <Progress
                    size="sm"
                    value={downloadInfo.progress}
                    maxValue={100}
                    color="primary"
                    className="h-0.5"
                    aria-label="Download progress"
                  />
                </div>
              )}
            </div>
          )
        },
        enableResizing: true
      },
      {
        accessorKey: 'version',
        header: () => t('version'),
        size: COLUMN_WIDTHS.VERSION,
        cell: ({ row }) => {
          const listVersion = row.original.version
          const isInstalled = row.original.isInstalled
          const deviceVersion = row.original.deviceVersionCode
          const displayListVersion = listVersion ? `v${listVersion}` : '-'
          return (
            <div className="flex flex-col justify-center">
              <span className="text-sm text-foreground">{displayListVersion}</span>
              {isInstalled && (
                <span className="text-xs text-default-400">
                  {deviceVersion !== undefined ? `Installed: v${deviceVersion}` : 'Installed'}
                </span>
              )}
            </div>
          )
        },
        enableResizing: true
      },
      {
        accessorKey: 'downloads',
        header: () => t('popularity'),
        size: COLUMN_WIDTHS.POPULARITY,
        cell: (info) => {
          const count = info.getValue()
          return (
            <span className="text-sm text-foreground">
              {typeof count === 'number' ? count.toLocaleString() : '-'}
            </span>
          )
        },
        enableResizing: true
      },
      {
        accessorKey: 'size',
        header: () => t('size'),
        size: COLUMN_WIDTHS.SIZE,
        sortingFn: (a, b) =>
          parseSizeBytes(a.original.size ?? '') - parseSizeBytes(b.original.size ?? ''),
        cell: (info) => {
          const sizeValue = info.getValue()
          const sizeStr = String(sizeValue || '')
          if (sizeStr === '0 MB' || !sizeStr.trim()) return null
          return <span className="text-sm text-foreground">{sizeStr}</span>
        },
        enableResizing: true
      },
      {
        accessorKey: 'lastUpdated',
        header: () => t('lastUpdated'),
        size: COLUMN_WIDTHS.LAST_UPDATED,
        sortingFn: (a, b) => {
          const da = a.original.lastUpdated ? new Date(a.original.lastUpdated).getTime() : 0
          const db = b.original.lastUpdated ? new Date(b.original.lastUpdated).getTime() : 0
          return da - db
        },
        cell: (info) => (
          <span className="text-sm text-foreground">{String(info.getValue() || '-')}</span>
        ),
        enableResizing: true
      },
      {
        accessorKey: 'isInstalled',
        header: 'Installed Status',
        enableResizing: false
      },
      {
        accessorKey: 'hasUpdate',
        header: 'Update Status',
        enableResizing: false
      }
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableWidth, t])

  const filteredGames = useMemo(() => {
    let hideAdult = true
    try {
      hideAdult = localStorage.getItem('vrcyberdeck:hideAdult') !== 'false'
    } catch {
      /* ignore */
    }
    return games.filter((game) => {
      const size = String(game.size ?? '').trim()
      if (size === '0 MB' || size === '') return false
      const adult = isAdultGame(game.name)
      if (categoryFilter === 'adult' && !adult) return false
      if (categoryFilter === 'non-adult' && adult) return false
      if (categoryFilter === 'all' && hideAdult && adult) return false
      return true
    })
  }, [games, categoryFilter])

  const table = useReactTable({
    data: filteredGames,
    columns,
    columnResizeMode: 'onChange',
    filterFns: {
      gameNameAndPackageFilter: filterGameNameAndPackage
    },
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility: { isInstalled: false, hasUpdate: false },
      columnSizing
    },
    onSortingChange: (updater) => {
      setSorting((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        const first = next[0]
        setPrefs({
          tableSortKey: first?.id ?? '',
          tableSortDir: first?.desc ? 'desc' : 'asc'
        })
        return next
      })
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnSizingChange: setColumnSizing,
    globalFilterFn: 'gameNameAndPackageFilter',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const { rows } = table.getRowModel()
  const estimatedRowHeight = Math.round(60 + (prefs.rowDensity / 100) * 65)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10
  })

  useEffect(() => {
    rowVirtualizer.measure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.rowDensity])

  const formatDate = (date: Date | null): string => {
    if (!date) return t('never')
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getProcessMessage = (): string => {
    if (downloadProgress > 0 && downloadProgress < 100) {
      return `${t('downloadingGameData')} ${downloadProgress}%`
    } else if (extractProgress > 0 && extractProgress < 100) {
      return `${t('extractingGameData')} ${extractProgress}%`
    } else if (loadingGames) {
      return t('preparingLibrary')
    }
    return ''
  }

  const getCurrentProgress = (): number => {
    if (downloadProgress > 0 && downloadProgress < 100) return downloadProgress
    if (extractProgress > 0 && extractProgress < 100) return extractProgress
    return 0
  }

  const handleRowClick = (
    _event: React.MouseEvent<HTMLTableRowElement>,
    row: Row<GameInfo>
  ): void => {
    setDialogGame(row.original)
    setIsDialogOpen(true)
  }

  useEffect(() => {
    if (dialogGame) setIsDialogOpen(true)
  }, [dialogGame])

  const handleCloseDialog = useCallback((): void => {
    setIsDialogOpen(false)
    setTimeout(() => {
      setDialogGame(null)
    }, 300)
  }, [setDialogGame])

  const handleInstall = (game: GameInfo): void => {
    if (!game) return
    addDownloadToQueue(game).catch((err) => console.error('Error adding to queue:', err))
  }

  const handleUninstall = async (game: GameInfo): Promise<void> => {
    if (!game || !game.packageName || !selectedDevice) {
      window.alert('Cannot start uninstall: Essential information is missing.')
      return
    }
    setIsLoading(true)
    try {
      const success = await window.api.adb.uninstallPackage(selectedDevice, game.packageName)
      if (!success) window.alert('Failed to uninstall the game.')
      await loadPackages()
    } catch (error) {
      console.error(`Uninstall error for ${game.name}:`, error)
      window.alert(`An error occurred during the uninstall process for ${game.name}.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReinstall = async (game: GameInfo): Promise<void> => {
    if (!game || !game.packageName || !game.releaseName || !selectedDevice) {
      window.alert('Cannot start reinstall: Essential information is missing.')
      return
    }
    setIsLoading(true)
    try {
      const uninstallSuccess = await window.api.adb.uninstallPackage(
        selectedDevice,
        game.packageName
      )
      if (uninstallSuccess) {
        const downloadInfo = downloadStatusMap.get(game.releaseName)
        if (downloadInfo?.status === 'Completed') {
          await window.api.downloads.installFromCompleted(game.releaseName, selectedDevice)
        } else {
          const addToQueueSuccess = await addDownloadToQueue(game)
          if (!addToQueueSuccess) {
            window.alert(`Reinstall for ${game.name} failed: Could not add to download queue.`)
          }
        }
      } else {
        window.alert(`Failed to uninstall ${game.name}. Reinstall aborted.`)
      }
    } catch (error) {
      console.error(`Reinstall error for ${game.name}:`, error)
      window.alert(`An error occurred during the reinstall process for ${game.name}.`)
    } finally {
      setIsLoading(false)
      loadPackages().catch((err) => console.error('Reinstall: Error refreshing packages:', err))
    }
  }

  const handleUpdate = async (game: GameInfo): Promise<void> => {
    if (!game || !game.releaseName || !selectedDevice) {
      window.alert('Cannot start update: Essential information is missing.')
      handleCloseDialog()
      return
    }
    try {
      const downloadInfo = downloadStatusMap.get(game.releaseName)
      if (downloadInfo?.status === 'Completed') {
        await window.api.downloads.installFromCompleted(game.releaseName, selectedDevice)
      } else {
        const addToQueueSuccess = await addDownloadToQueue(game)
        if (!addToQueueSuccess) {
          window.alert(`Could not queue ${game.name} for update.`)
        }
      }
    } catch (error) {
      console.error(`Update error for ${game.name}:`, error)
      window.alert(`An error occurred during the update process for ${game.name}.`)
    }
  }

  const handleRetry = (game: GameInfo): void => {
    if (!game || !game.releaseName) return
    retryDownload(game.releaseName)
  }

  const handleCancelDownload = (game: GameInfo): void => {
    if (!game || !game.releaseName) return
    cancelDownload(game.releaseName)
  }

  const handleInstallFromCompleted = (game: GameInfo): void => {
    if (!game || !game.releaseName || !selectedDevice) {
      window.alert('Cannot start installation: Missing required information.')
      return
    }
    window.api.downloads
      .installFromCompleted(game.releaseName, selectedDevice)
      .catch((err) => {
        console.error('Error triggering install from completed:', err)
        window.alert('Failed to start installation.')
      })
  }

  const handleDeleteDownloaded = useCallback(
    async (game: GameInfo | null): Promise<void> => {
      if (!game || !game.releaseName) return
      try {
        const success = await deleteFiles(game.releaseName)
        if (!success) window.alert('Failed to delete downloaded files.')
      } catch (error) {
        console.error('Error calling deleteFiles:', error)
        window.alert('An error occurred while trying to delete downloaded files.')
      }
      handleCloseDialog()
    },
    [deleteFiles, handleCloseDialog]
  )

  const handleManualInstall = useCallback(
    async (type: 'apk' | 'folder') => {
      if (!isConnected || !selectedDevice) {
        window.alert('Please connect to a device first.')
        return
      }
      try {
        let filePath: string | null = null
        let itemName: string = ''
        if (type === 'apk') {
          filePath = await window.api.dialog.showApkFilePicker()
          itemName = 'APK file'
        } else {
          filePath = await window.api.dialog.showFolderPicker()
          itemName = 'folder'
        }
        if (!filePath) return

        const fileName = filePath.split(/[/\\]/).pop() || filePath
        setShowInstallDialog(true)
        setIsManualInstalling(true)
        setInstallStatusMessage(`Installing ${itemName}: ${fileName}...`)
        setInstallSuccess(null)

        const success = await window.api.downloads.installManualFile(filePath, selectedDevice)
        setInstallSuccess(success)
        if (success) {
          setInstallStatusMessage(`"${fileName}" installed successfully!`)
          await loadPackages()
        } else {
          setInstallStatusMessage(`Failed to install "${fileName}"`)
        }
      } catch (error) {
        console.error(`Error during ${type} installation:`, error)
        setInstallStatusMessage('Installation error occurred')
        setInstallSuccess(false)
      } finally {
        setIsManualInstalling(false)
      }
    },
    [isConnected, selectedDevice, loadPackages]
  )

  const handleCopyObbFolder = useCallback(async () => {
    if (!isConnected || !selectedDevice) {
      window.alert('Please connect to a device first.')
      return
    }
    try {
      const folderPath = await window.api.dialog.showFolderPicker()
      if (!folderPath) return
      const folderName = folderPath.split(/[/\\]/).pop() || folderPath
      try {
        const installedPackages = await window.api.adb.getInstalledPackages(selectedDevice)
        const matchingPackage = installedPackages.find((pkg) => pkg.packageName === folderName)
        if (!matchingPackage) {
          setObbFolderToConfirm(folderPath)
          setShowObbConfirmDialog(true)
          return
        }
      } catch (error) {
        const proceed = window.confirm(
          `Could not verify installed packages. Do you want to proceed with copying "${folderName}" to the OBB directory?`
        )
        if (!proceed) return
      }
      await performObbCopy(folderPath)
    } catch (error) {
      console.error(`Error during OBB folder copy:`, error)
      setInstallStatusMessage('OBB copy error occurred')
      setInstallSuccess(false)
      setShowInstallDialog(true)
      setIsManualInstalling(false)
    }
  }, [isConnected, selectedDevice])

  const performObbCopy = useCallback(
    async (folderPath: string) => {
      if (!selectedDevice) return
      const folderName = folderPath.split(/[/\\]/).pop() || folderPath
      setShowInstallDialog(true)
      setIsManualInstalling(true)
      setInstallStatusMessage(`Copying OBB folder: ${folderName}...`)
      setInstallSuccess(null)
      try {
        const success = await window.api.downloads.copyObbFolder(folderPath, selectedDevice)
        setInstallSuccess(success)
        if (success) {
          setInstallStatusMessage(`"${folderName}" copied to OBB directory successfully!`)
        } else {
          setInstallStatusMessage(`Failed to copy "${folderName}" to OBB directory`)
        }
      } catch (error) {
        console.error(`Error during OBB folder copy:`, error)
        setInstallStatusMessage('OBB copy error occurred')
        setInstallSuccess(false)
      } finally {
        setIsManualInstalling(false)
      }
    },
    [selectedDevice]
  )

  const handleObbConfirmCopy = useCallback(async () => {
    if (!obbFolderToConfirm) return
    setShowObbConfirmDialog(false)
    await performObbCopy(obbFolderToConfirm)
    setObbFolderToConfirm(null)
  }, [obbFolderToConfirm, performObbCopy])

  const handleObbCancelCopy = useCallback(() => {
    setShowObbConfirmDialog(false)
    setObbFolderToConfirm(null)
  }, [])

  const closeInstallDialog = useCallback(() => {
    setShowInstallDialog(false)
    setInstallSuccess(null)
    setInstallStatusMessage('')
  }, [])

  const isBusy = adbLoading || loadingGames || isLoading || isManualInstalling
  const displayedCount = table.getFilteredRowModel().rows.length

  // ── View options popover content ──────────────────────────────────────────
  const ViewOptionsContent = () => (
    <div className="p-4 min-w-[260px] flex flex-col gap-4">
      {prefs.viewMode === 'cards' ? (
        <>
          <p className="text-sm font-semibold text-foreground">Card view options</p>
          <div>
            <p className="text-xs text-default-500 mb-2">Card size</p>
            <input
              type="range"
              min={0}
              max={100}
              value={prefs.cardSize}
              onChange={(e) => setPrefs({ cardSize: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <p className="text-xs text-default-500 mb-2">Sort by</p>
            <div className="flex gap-2">
              <select
                value={prefs.cardSortKey}
                onChange={(e) => {
                  const key = e.target.value
                  setPrefs({ cardSortKey: key })
                  setSorting(key ? [{ id: key, desc: prefs.cardSortDir === 'desc' }] : [])
                }}
                className="flex-1 bg-content2 text-foreground border border-divider rounded-lg text-xs px-2 py-1.5"
              >
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="downloads">Popularity</option>
                <option value="lastUpdated">Last updated</option>
                <option value="version">Version</option>
              </select>
              <button
                onClick={() => {
                  const dir = prefs.cardSortDir === 'asc' ? 'desc' : 'asc'
                  setPrefs({ cardSortDir: dir })
                  if (prefs.cardSortKey)
                    setSorting([{ id: prefs.cardSortKey, desc: dir === 'desc' }])
                }}
                className="bg-content2 border border-divider rounded-lg text-xs text-foreground px-2 py-1.5 hover:bg-content3 transition-colors"
              >
                {prefs.cardSortDir === 'asc' ? '▲ Asc' : '▼ Desc'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-foreground">Display options</p>
          <div>
            <p className="text-xs text-default-500 mb-2">Row density</p>
            <input
              type="range"
              min={50}
              max={100}
              value={Math.max(50, prefs.rowDensity)}
              onChange={(e) => setPrefs({ rowDensity: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-default-500">Alternating rows</p>
            <Switch
              size="sm"
              isSelected={prefs.alternatingRows}
              onValueChange={(checked) => setPrefs({ alternatingRows: checked })}
            />
          </div>
          {prefs.alternatingRows && (
            <div className="flex flex-col gap-3">
              {(
                [
                  { label: 'Even row colour', key: 'evenRowColor' as const },
                  { label: 'Odd row colour', key: 'oddRowColor' as const }
                ] as { label: string; key: 'evenRowColor' | 'oddRowColor' }[]
              ).map(({ label, key }) => (
                <div key={key}>
                  <p className="text-xs text-default-500 mb-2">{label}</p>
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.label}
                        title={sw.label}
                        className="w-5 h-5 rounded transition-all"
                        style={{
                          background: sw.value,
                          outline:
                            prefs[key] === sw.value
                              ? '2px solid #3D7DFF'
                              : '1px solid rgba(128,128,128,0.3)',
                          outlineOffset: '1px'
                        }}
                        onClick={() => setPrefs({ [key]: sw.value })}
                      />
                    ))}
                    <input
                      type="color"
                      value={prefs[key] === 'transparent' ? '#000000' : prefs[key]}
                      title="Custom colour"
                      className="w-5 h-5 rounded border border-divider cursor-pointer p-0 bg-transparent"
                      onChange={(e) => setPrefs({ [key]: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* ════════ HEADER BAR ════════ */}
      <header className="flex-shrink-0 px-8 py-4 border-b border-divider bg-content1/80 backdrop-blur-sm z-10">
        {/* Row 1: title + count + device chip */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Library</h1>
            <span className="text-sm text-default-500">
              {displayedCount.toLocaleString()} games
              {lastSyncTime && <span className="ml-2">· Synced {formatDate(lastSyncTime)}</span>}
            </span>
          </div>
          <ConnectedDeviceChip
            selectedDeviceDetails={selectedDeviceDetails}
            isConnected={isConnected}
            isBusy={isBusy}
            onDisconnect={() => {
              requestUploadCheck()
              disconnectDevice()
            }}
            onRefreshPackages={() => loadPackages()}
            onAdbShell={() => setShellDialogOpen(true)}
            t={t}
          />
        </div>

        {/* Row 2: toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex items-center flex-1 min-w-0 max-w-md">
            <span className="absolute left-3 text-default-400 pointer-events-none z-10">
              <Search size={14} />
            </span>
            <input
              type="search"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-content2 border border-divider rounded-xl pl-8 pr-8 py-1.5 text-sm text-foreground placeholder:text-default-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchInput && (
              <button
                onClick={handleSearchClear}
                className="absolute right-3 text-default-400 hover:text-default-700 transition-colors"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {(
              [
                { key: 'all' as FilterType, label: t('filterAll'), count: counts.total },
                {
                  key: 'installed' as FilterType,
                  label: t('filterInstalled'),
                  count: counts.installed
                },
                {
                  key: 'update' as FilterType,
                  label: t('filterUpdates'),
                  count: counts.updates
                }
              ] as { key: FilterType; label: string; count: number }[]
            ).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                disabled={key === 'update' && counts.updates === 0}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeFilter === key
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-default-500 hover:text-foreground hover:bg-content2',
                  key === 'update' && counts.updates === 0
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer'
                ].join(' ')}
              >
                {label}
                <span
                  className={`text-xs px-1 py-0 rounded-full ${
                    activeFilter === key
                      ? 'bg-white/20 text-white'
                      : 'bg-content3 text-default-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Category select */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            title="Filter by category"
            className="flex-shrink-0 bg-content2 text-foreground border border-divider rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">All games</option>
            <option value="non-adult">Safe only</option>
            <option value="adult">Adult (18+)</option>
          </select>

          <div className="flex-1" />

          {/* View toggle */}
          <Tooltip
            content={
              prefs.viewMode === 'table' ? 'Switch to card view' : 'Switch to table view'
            }
            placement="bottom"
          >
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              color="default"
              aria-label="Toggle view"
              onPress={() => {
                const next = prefs.viewMode === 'table' ? 'cards' : 'table'
                setPrefs({ viewMode: next })
                if (next === 'cards' && prefs.cardSortKey) {
                  setSorting([{ id: prefs.cardSortKey, desc: prefs.cardSortDir === 'desc' }])
                } else if (next === 'table') {
                  setSorting([])
                }
              }}
            >
              {prefs.viewMode === 'table' ? <LayoutGrid size={15} /> : <Table2 size={15} />}
            </Button>
          </Tooltip>

          {/* Display options popover */}
          <Popover
            isOpen={viewOptionsOpen}
            onOpenChange={setViewOptionsOpen}
            placement="bottom-end"
          >
            <PopoverTrigger>
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                color="default"
                aria-label="Display options"
              >
                <SlidersHorizontal size={15} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <ViewOptionsContent />
            </PopoverContent>
          </Popover>

          {/* More dropdown */}
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                color="default"
                aria-label="More actions"
              >
                <MoreHorizontal size={15} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="More actions">
              <DropdownItem
                key="refresh"
                startContent={<RefreshCw size={14} />}
                onPress={() => refreshGames()}
                isDisabled={isBusy}
              >
                {isBusy ? t('working') : t('refreshGames')}
              </DropdownItem>
              <DropdownItem
                key="mirrors"
                startContent={<Globe size={14} />}
                onPress={() => setShowMirrorMgmt(true)}
              >
                Manage mirrors
              </DropdownItem>
              {isUsingVrSrcEndpoint ? (
                <DropdownItem key="local-upload" startContent={<Upload size={14} />}>
                  <LocalUploadDialog />
                </DropdownItem>
              ) : (null as unknown as React.ReactElement)}
              <DropdownItem
                key="upload-games"
                startContent={<Upload size={14} />}
                onPress={() => setShowUploadGames(true)}
              >
                Upload local files
              </DropdownItem>
              <DropdownItem
                key="manual-install-apk"
                startContent={<FolderPlus size={14} />}
                onPress={() => handleManualInstall('apk')}
                isDisabled={isBusy || !isConnected}
              >
                {t('installApkFile')}
              </DropdownItem>
              <DropdownItem
                key="manual-install-folder"
                startContent={<FolderPlus size={14} />}
                onPress={() => handleManualInstall('folder')}
                isDisabled={isBusy || !isConnected}
              >
                {t('installFolder')}
              </DropdownItem>
              <DropdownItem
                key="copy-obb"
                startContent={<FolderPlus size={14} />}
                onPress={handleCopyObbFolder}
                isDisabled={isBusy || !isConnected}
              >
                {t('copyObbFolder')}
              </DropdownItem>
              <DropdownItem
                key="adb-shell"
                startContent={<Terminal size={14} />}
                onPress={() => setShellDialogOpen(true)}
                isDisabled={!isConnected}
              >
                ADB shell
              </DropdownItem>
              <DropdownItem
                key="transfers"
                startContent={<ArrowDownToLine size={14} />}
                onPress={onTransfers}
              >
                Transfers
                {activeTransferCount > 0 && (
                  <Chip size="sm" color="primary" variant="flat" className="ml-2 text-xs h-4">
                    {activeTransferCount}
                  </Chip>
                )}
              </DropdownItem>
              <DropdownItem
                key="settings"
                startContent={<Settings size={14} />}
                onPress={onSettings}
              >
                Settings
              </DropdownItem>
              <DropdownItem
                key="back"
                startContent={<LogOut size={14} />}
                onPress={onBackToDevices}
              >
                Change device
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </header>

      {/* Progress bar for library sync */}
      {loadingGames && (downloadProgress > 0 || extractProgress > 0) && (
        <div className="flex-shrink-0 px-4 py-2 bg-content1/60 border-b border-divider">
          <Progress
            size="sm"
            value={getCurrentProgress()}
            maxValue={100}
            color="primary"
            label={getProcessMessage()}
            className="max-w-full"
            aria-label="Library sync progress"
          />
        </div>
      )}

      {/* Busy indicator strip */}
      {isBusy &&
        !loadingGames &&
        !downloadProgress &&
        !extractProgress &&
        installStatusMessage === '' && (
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/20">
            <Spinner size="sm" color="primary" />
            <span className="text-xs text-default-500">{t('processing')}</span>
          </div>
        )}

      {/* Install status strip */}
      {installStatusMessage !== '' && !showInstallDialog && (
        <div className="flex-shrink-0 px-4 py-2 bg-content1/60 border-b border-divider">
          <p className="text-xs text-default-500">{installStatusMessage}</p>
        </div>
      )}

      {/* ════════ CONTENT ════════ */}
      <div className="flex-1 overflow-hidden flex flex-col px-8 py-6">
        {loadingGames ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <Spinner size="lg" color="primary" />
            <p className="text-sm text-default-400">{t('loadingGamesLibrary')}</p>
          </div>
        ) : gamesError ? (
          <div className="flex items-center justify-center flex-1">
            <div className="bg-danger/10 border border-danger/30 rounded-large px-6 py-4">
              <p className="text-sm text-danger">{gamesError}</p>
            </div>
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-5 px-6 py-10">
            <LibraryBig size={48} className="text-default-300" />
            <div className="text-center">
              <p className="text-base font-semibold text-foreground mb-1">No games found</p>
              <p className="text-sm text-default-400">Sync your library to discover games</p>
            </div>
            <Button
              color="primary"
              variant="flat"
              size="sm"
              startContent={<RefreshCw size={14} />}
              onPress={() => refreshGames()}
              isDisabled={isBusy}
            >
              {isBusy ? t('working') : t('refreshGames')}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3">
            <LibraryBig size={48} className="text-default-300" />
            <p className="text-base text-default-500">No games match your filters.</p>
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                setActiveFilter('all')
                setSearchInput('')
                setGlobalFilter('')
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : prefs.viewMode === 'cards' ? (
          /* ── Card grid ── */
          <div
            className="overflow-auto"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${140 + Math.round(prefs.cardSize * 1.4)}px, 1fr))`,
              gap: '1rem',
              alignContent: 'start'
            }}
          >
            {rows.map((row) => {
              const game = row.original
              const ds = game.releaseName ? downloadStatusMap.get(game.releaseName) : undefined
              const badge = getGameBadge(game)
              return (
                <Card
                  key={row.id}
                  isPressable
                  shadow="sm"
                  onPress={() => {
                    setDialogGame(game)
                    setIsDialogOpen(true)
                  }}
                  className="bg-content1 border border-divider"
                >
                  <CardBody className="p-0">
                    <div className="relative aspect-square w-full overflow-hidden">
                      <Image
                        src={
                          game.thumbnailPath ? `file://${game.thumbnailPath}` : placeholderImage
                        }
                        alt={game.name}
                        radius="none"
                        className="w-full h-full object-cover"
                        removeWrapper
                      />
                      {game.isInstalled ? (
                        <div className="absolute top-2 right-2">
                          <Chip
                            size="sm"
                            color={game.hasUpdate ? 'warning' : 'success'}
                            variant="flat"
                            className="text-xs"
                          >
                            {game.hasUpdate ? 'Update' : 'Installed'}
                          </Chip>
                        </div>
                      ) : badge ? (
                        <div className="absolute top-2 right-2">
                          <Chip
                            size="sm"
                            color={badge === 'new' ? 'success' : 'warning'}
                            variant="flat"
                            className="text-xs"
                          >
                            {badge === 'new' ? 'New' : 'Updated'}
                          </Chip>
                        </div>
                      ) : null}
                    </div>
                    <div className="p-3 flex flex-col gap-1">
                      <p className="text-sm font-semibold line-clamp-2">{game.name}</p>
                      <p className="text-xs text-default-500">
                        {game.version ? `v${game.version}` : ''}
                        {game.size ? ` · ${game.size}` : ''}
                      </p>
                      {ds && ds.status !== 'Completed' && (
                        <p className="text-xs text-primary">
                          {ds.status}
                          {ds.progress ? ` ${ds.progress}%` : ''}
                        </p>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        ) : (
          /* ── Table ── */
          <div
            ref={tableContainerRef}
            className="overflow-auto flex-1"
            style={{ position: 'relative' }}
          >
            {(() => {
              const totalSize = table.getTotalSize()
              return (
                <table
                  style={{
                    width: '100%',
                    minWidth: totalSize,
                    display: 'block',
                    borderCollapse: 'collapse'
                  }}
                >
                  <thead
                    style={{ display: 'block', position: 'sticky', top: 0, zIndex: 1 }}
                  >
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} style={{ display: 'flex', width: '100%' }}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            colSpan={header.colSpan}
                            className="text-xs font-semibold text-default-500 px-3 py-2 border-b border-divider bg-content1"
                            style={{
                              flex: `${header.getSize()} 0 0`,
                              minWidth: header.getSize(),
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              textAlign: 'left'
                            }}
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                className={
                                  header.column.getCanSort()
                                    ? 'cursor-pointer select-none flex items-center gap-1'
                                    : 'flex items-center gap-1'
                                }
                                onClick={header.column.getToggleSortingHandler()}
                                style={{ flex: 1, minWidth: 0 }}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {header.column.getIsSorted() === 'asc' && (
                                  <span className="text-xs text-primary">▲</span>
                                )}
                                {header.column.getIsSorted() === 'desc' && (
                                  <span className="text-xs text-default-400">▼</span>
                                )}
                                {!header.column.getIsSorted() &&
                                  header.column.getCanSort() && (
                                    <ArrowUpDown size={10} className="text-default-300" />
                                  )}
                              </div>
                            )}
                            {header.column.getCanResize() && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/40 transition-colors ${header.column.getIsResizing() ? 'bg-primary' : ''}`}
                              />
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody
                    style={{
                      display: 'block',
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      position: 'relative'
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const row = rows[virtualRow.index]
                      if (!row) return null
                      const isEven = virtualRow.index % 2 === 0
                      const bgColor = prefs.alternatingRows
                        ? isEven
                          ? prefs.evenRowColor
                          : prefs.oddRowColor
                        : undefined
                      return (
                        <tr
                          key={row.id}
                          style={{
                            display: 'flex',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                            backgroundColor: bgColor,
                            cursor: 'pointer'
                          }}
                          className="hover:bg-content2 transition-colors border-b border-divider"
                          onClick={(e) => handleRowClick(e, row)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="text-sm text-foreground px-3 py-2 whitespace-nowrap"
                              style={{
                                flex: `${cell.column.getSize()} 0 0`,
                                minWidth: cell.column.getSize(),
                                display: 'flex',
                                alignItems: 'center',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })()}
          </div>
        )}
      </div>

      {/* ════════ DIALOGS ════════ */}
      {dialogGame && (
        <GameDetailsDialog
          game={dialogGame}
          open={isDialogOpen}
          onClose={handleCloseDialog}
          downloadStatusMap={downloadStatusMap}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          onReinstall={handleReinstall}
          onUpdate={handleUpdate}
          onRetry={handleRetry}
          onCancelDownload={handleCancelDownload}
          onDeleteDownloaded={handleDeleteDownloaded}
          onInstallFromCompleted={handleInstallFromCompleted}
          getNote={getNote}
          isConnected={isConnected}
          isBusy={isBusy}
        />
      )}

      {selectedDevice && (
        <AdbShellDialog
          deviceId={selectedDevice}
          isOpen={shellDialogOpen}
          onDismiss={() => setShellDialogOpen(false)}
        />
      )}

      {/* Manual install dialog */}
      {showInstallDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-content1 border border-divider rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold text-foreground mb-4">
              {t('manualOperation')}
            </h3>
            <div className="mb-3">
              <p className="text-sm text-foreground/80">{installStatusMessage}</p>
            </div>
            {isManualInstalling && (
              <div className="flex items-center gap-2 mb-3">
                <Spinner size="sm" color="primary" />
                <span className="text-sm text-default-500">{t('processing')}</span>
              </div>
            )}
            {installSuccess !== null && (
              <div
                className={`flex items-center gap-2 p-3 rounded-xl mb-3 ${installSuccess ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}
              >
                {installSuccess ? <Check size={16} /> : <X size={16} />}
                <span className="text-sm font-medium">
                  {installSuccess ? t('operationSuccess') : t('operationFailed')}
                </span>
              </div>
            )}
            <Button
              color="primary"
              size="sm"
              onPress={closeInstallDialog}
              isDisabled={isManualInstalling}
              className="w-full"
            >
              {isManualInstalling ? t('processing') : t('close')}
            </Button>
          </div>
        </div>
      )}

      {/* OBB confirm dialog */}
      {showObbConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-content1 border border-divider rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold text-foreground mb-3">
              {t('confirmObbCopy')}
            </h3>
            <p className="text-sm text-default-500 mb-2">
              {t('obbNoPackageFound')} &quot;{obbFolderToConfirm?.split(/[/\\]/).pop()}&quot;.
            </p>
            <p className="text-sm text-default-500 mb-4">{t('obbCopyConfirm')}</p>
            <div className="flex gap-2">
              <Button
                color="primary"
                size="sm"
                onPress={handleObbConfirmCopy}
                isDisabled={isManualInstalling}
                className="flex-1"
              >
                {t('copyAnyway')}
              </Button>
              <Button
                color="default"
                variant="flat"
                size="sm"
                onPress={handleObbCancelCopy}
                isDisabled={isManualInstalling}
                className="flex-1"
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mirror management modal */}
      {showMirrorMgmt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="bg-content1 border border-divider rounded-2xl flex flex-col shadow-2xl"
            style={{ width: '80vw', maxWidth: '1200px', height: '80vh' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-divider flex-shrink-0">
              <h3 className="text-base font-semibold text-foreground">Mirror management</h3>
              <button
                className="text-default-400 hover:text-default-700 transition-colors"
                onClick={() => setShowMirrorMgmt(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-6">
              <MirrorManagement />
            </div>
            <div className="px-6 py-4 border-t border-divider flex-shrink-0 flex justify-end">
              <Button
                color="default"
                variant="flat"
                size="sm"
                onPress={() => setShowMirrorMgmt(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload games dialog */}
      {showUploadGames && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="bg-content1 border border-divider rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: '90vw', maxWidth: '700px', maxHeight: '85vh' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
              <h3 className="text-base font-semibold text-foreground">Upload local files</h3>
              <button
                className="text-default-400 hover:text-default-700 transition-colors"
                onClick={() => setShowUploadGames(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              <UploadGamesDialog />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GamesView
