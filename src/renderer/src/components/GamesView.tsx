import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback
} from 'react'
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
  Search,
  LayoutGrid,
  Table2,
  MoreHorizontal,
  SlidersHorizontal,
  BatteryMedium,
  LogOut,
  RefreshCw,
  Terminal,
  Upload,
  FolderPlus,
  Check,
  LibraryBig,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
  Globe
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
import { getSideloadingDisabled } from '../hooks/useExtrasSettings'

// shadcn primitives
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import { Switch } from './ui/switch'
import {
  Tabs,
  TabsList,
  TabsTrigger
} from './ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from './ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table'

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMN_WIDTHS = {
  STATUS: 56,
  THUMBNAIL: 88,
  VERSION: 180,
  POPULARITY: 120,
  SIZE: 88,
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
  } catch { /* ignore */ }
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
  )
    return 'new'
  if (
    game.versionChangedAt &&
    game.versionChangedAt > SNAPSHOT_TRACKING_EPOCH_MS &&
    now - game.versionChangedAt <= UPDATED_THRESHOLD_MS
  )
    return 'updated'
  return null
}

const filterGameNameAndPackage: FilterFn<GameInfo> = (row, _columnId, filterValue) => {
  const s = String(filterValue).toLowerCase()
  return (
    String(row.original.name ?? '').toLowerCase().includes(s) ||
    String(row.original.packageName ?? '').toLowerCase().includes(s) ||
    String(row.original.releaseName ?? '').toLowerCase().includes(s)
  )
}

declare module '@tanstack/react-table' {
  interface FilterFns {
    gameNameAndPackageFilter: FilterFn<GameInfo>
  }
}

function parseStorageGB(s: string | null | undefined): number {
  if (!s) return 0
  const m = s.match(/(\d+(?:\.\d+)?)\s*([GT])/i)
  if (!m) return 0
  return /T/i.test(m[2]) ? parseFloat(m[1]) * 1024 : parseFloat(m[1])
}

// ─── ConnectedDeviceChip ──────────────────────────────────────────────────────
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
  const [open, setOpen] = useState(false)

  if (!isConnected || !selectedDeviceDetails) {
    return (
      <Badge variant="outline" className="text-muted-foreground text-xs">
        No device
      </Badge>
    )
  }

  const modelName = selectedDeviceDetails.friendlyModelName ?? 'Quest'
  const battery = selectedDeviceDetails.batteryLevel
  const batteryLow = battery != null && battery <= 20

  const freeGB = parseStorageGB(selectedDeviceDetails.storageFree)
  const totalGB = parseStorageGB(selectedDeviceDetails.storageTotal)
  const storageUsedPct = totalGB > 0 ? Math.round(((totalGB - freeGB) / totalGB) * 100) : 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          className="cursor-pointer text-xs bg-primary/15 text-primary border-primary/30 border hover:bg-primary/25 transition-colors gap-1.5 py-1 px-2.5"
          role="button"
          aria-label={`Connected device: ${modelName}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
          <span className="font-medium truncate max-w-[140px]">{modelName}</span>
          {battery != null && (
            <span className={`flex items-center gap-0.5 ${batteryLow ? 'text-destructive' : 'text-emerald-500'}`}>
              <BatteryMedium className="h-3 w-3" />
              {battery}%
            </span>
          )}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium text-foreground px-2 py-1">{modelName}</p>
          {selectedDeviceDetails.storageFree && selectedDeviceDetails.storageTotal && (
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground mb-1">Storage</p>
              <Progress value={storageUsedPct} className="h-1" aria-label="Storage used" />
              <p className="text-xs text-muted-foreground mt-1">
                {selectedDeviceDetails.storageFree} free
              </p>
            </div>
          )}
          <Separator className="my-0.5" />
          <button
            className="flex items-center gap-2 text-xs text-foreground hover:bg-accent rounded-sm px-2 py-1.5 transition-colors w-full text-left disabled:opacity-50"
            onClick={() => { onRefreshPackages(); setOpen(false) }}
            disabled={isBusy}
          >
            <RefreshCw className="h-3 w-3" />
            {t('refreshQuest')}
          </button>
          <button
            className="flex items-center gap-2 text-xs text-foreground hover:bg-accent rounded-sm px-2 py-1.5 transition-colors w-full text-left disabled:opacity-50"
            onClick={() => { onAdbShell(); setOpen(false) }}
            disabled={!isConnected}
          >
            <Terminal className="h-3 w-3" />
            ADB shell
          </button>
          <Separator className="my-0.5" />
          <button
            className="flex items-center gap-2 text-xs text-destructive hover:bg-destructive/10 rounded-sm px-2 py-1.5 transition-colors w-full text-left"
            onClick={() => { onDisconnect(); setOpen(false) }}
          >
            <LogOut className="h-3 w-3" />
            Disconnect
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── GamesView props ──────────────────────────────────────────────────────────
interface GamesViewProps {
  onBackToDevices: () => void
  onTransfers: () => void
  onSettings: () => void
}

// ─── Main component ───────────────────────────────────────────────────────────
const GamesView: React.FC<GamesViewProps> = ({ onBackToDevices: _onBackToDevices, onTransfers: _onTransfers, onSettings: _onSettings }) => {
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

  // ── Dialog / modal state ─────────────────────────────────────────────────
  const [shellDialogOpen, setShellDialogOpen] = useState(false)
  const [showMirrorMgmt, setShowMirrorMgmt] = useState(false)
  const [showUploadGames, setShowUploadGames] = useState(false)

  // ── Table prefs & filter state ───────────────────────────────────────────
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
    prefs.tableSortKey
      ? [{ id: prefs.tableSortKey, desc: prefs.tableSortDir === 'desc' }]
      : []
  )
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [categoryFilter, setCategoryFilterState] = useState<CategoryFilter>(() =>
    readCategoryFilter()
  )
  const setCategoryFilter = useCallback((v: CategoryFilter) => {
    setCategoryFilterState(v)
    try { localStorage.setItem(CATEGORY_FILTER_KEY, v) } catch { /* ignore */ }
  }, [])

  const [isLoading, setIsLoading] = useState(false)
  const [dialogGame, setDialogGame] = useGameDialog()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [tableWidth, setTableWidth] = useState(0)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})

  // Manual install state
  const [isManualInstalling, setIsManualInstalling] = useState(false)
  const [installStatusMessage, setInstallStatusMessage] = useState('')
  const [showInstallDialog, setShowInstallDialog] = useState(false)
  const [installSuccess, setInstallSuccess] = useState<boolean | null>(null)
  const [showObbConfirmDialog, setShowObbConfirmDialog] = useState(false)
  const [obbFolderToConfirm, setObbFolderToConfirm] = useState<string | null>(null)

  // ── Counts ───────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const total = games.length
    const installed = games.filter((g) => g.isInstalled).length
    const updates = games.filter((g) => g.hasUpdate).length
    return { total, installed, updates }
  }, [games])

  // ── Density CSS vars ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = tableContainerRef.current
    if (!el) return
    const padV = 4 + (prefs.rowDensity / 100) * 12
    const thumb = 48 + (prefs.rowDensity / 100) * 42
    el.style.setProperty('--row-pad-v', `${padV}px`)
    el.style.setProperty('--row-thumb-size', `${Math.round(thumb)}px`)
  }, [prefs])

  // ── Filter syncing ───────────────────────────────────────────────────────
  useEffect(() => {
    setColumnFilters((prev) => {
      const others = prev.filter((f) => f.id !== 'isInstalled' && f.id !== 'hasUpdate')
      switch (activeFilter) {
        case 'installed':
          return [...others, { id: 'isInstalled', value: true }]
        case 'update':
          return [...others, { id: 'isInstalled', value: true }, { id: 'hasUpdate', value: true }]
        default:
          return others
      }
    })
  }, [activeFilter])

  // ── Listen for install completion (refresh packages) ─────────────────────
  useEffect(() => {
    const unsub = window.api.adb.onInstallationCompleted((deviceId) => {
      if (selectedDevice && deviceId === selectedDevice) {
        loadPackages().catch((err) => console.error('[GamesView] Package refresh error:', err))
      }
    })
    return () => { unsub() }
  }, [selectedDevice, loadPackages])

  // ── Download status map ──────────────────────────────────────────────────
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
          progress,
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

  // ── Table width observer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!tableContainerRef.current) return
    const current = tableContainerRef.current
    const update = (): void => {
      if (tableContainerRef.current) {
        setTableWidth(tableContainerRef.current.clientWidth)
        setColumnSizing({})
      }
    }
    update()
    const ro = new ResizeObserver(() => window.requestAnimationFrame(update))
    ro.observe(current)
    return () => ro.unobserve(current)
  }, [])

  // ── Columns ──────────────────────────────────────────────────────────────
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
          const g = row.original
          const dlInfo = g.releaseName ? downloadStatusMapRef.current.get(g.releaseName) : undefined
          return (
            <div className="flex items-center justify-center h-full gap-1">
              {g.isInstalled && !g.hasUpdate && (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 border px-1 py-0 h-5 min-w-0">
                  <Check className="h-2.5 w-2.5" />
                </Badge>
              )}
              {g.hasUpdate && (
                <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 border px-1 py-0 h-5 min-w-0">
                  <RefreshCw className="h-2.5 w-2.5" />
                </Badge>
              )}
              {dlInfo?.status === 'Completed' && !g.isInstalled && (
                <Badge variant="secondary" className="px-1 py-0 h-5 min-w-0">
                  <Check className="h-2.5 w-2.5" />
                </Badge>
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
        enableSorting: false,
        cell: ({ getValue }) => {
          const p = getValue() as string | undefined
          return (
            <div
              style={{
                width: 'var(--row-thumb-size, 56px)',
                height: 'var(--row-thumb-size, 56px)',
                borderRadius: '6px',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              <img
                src={p ? `file://${p}` : placeholderImage}
                alt="Thumbnail"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )
        }
      },
      {
        accessorKey: 'name',
        header: () => t('namePackage'),
        size: nameColumnWidth > 0 ? nameColumnWidth : COLUMN_WIDTHS.MIN_NAME_PACKAGE,
        enableResizing: true,
        sortingFn: (rowA, rowB) => {
          const a = (rowA.original.name ?? '').toLowerCase()
          const b = (rowB.original.name ?? '').toLowerCase()
          for (let i = 0; i < Math.max(a.length, b.length); i++) {
            if (i >= a.length) return -1
            if (i >= b.length) return 1
            const ca = a[i], cb = b[i]
            if (ca === cb) continue
            const p = (c: string) => (c === '_' ? 0 : c >= '0' && c <= '9' ? 1 : 2)
            const pa = p(ca), pb = p(cb)
            if (pa !== pb) return pa - pb
            return ca < cb ? -1 : 1
          }
          return 0
        },
        cell: ({ row }) => {
          const g = row.original
          const dlInfo = g.releaseName ? downloadStatusMapRef.current.get(g.releaseName) : undefined
          const isActive =
            dlInfo?.status === 'Downloading' ||
            dlInfo?.status === 'Extracting' ||
            dlInfo?.status === 'Installing'
          const isQueued = dlInfo?.status === 'Queued'
          const isInstallError = dlInfo?.status === 'InstallError'
          const badge = getGameBadge(g)

          return (
            <div
              className="flex flex-col justify-center h-full relative"
              style={{ paddingBottom: '6px' }}
            >
              <div className="mb-1">
                <div className="text-sm font-medium text-foreground truncate">{g.name}</div>
                <div className="text-xs text-muted-foreground truncate">{g.releaseName}</div>
                <div className="text-xs text-muted-foreground truncate">{g.packageName}</div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {badge === 'new' && (
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 border text-xs h-4 px-1">
                    New
                  </Badge>
                )}
                {badge === 'updated' && (
                  <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 border text-xs h-4 px-1">
                    Updated
                  </Badge>
                )}
                {isQueued && (
                  <Badge variant="outline" className="text-xs h-4 px-1">
                    {t('queued')}
                  </Badge>
                )}
                {isActive && (
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <Badge className="bg-primary/15 text-primary border-primary/30 border text-xs h-4 px-1">
                      {dlInfo?.status}
                      {dlInfo?.status === 'Downloading' && dlInfo.progress != null
                        ? ` ${dlInfo.progress}%`
                        : ''}
                    </Badge>
                    {dlInfo?.status === 'Downloading' && dlInfo.speed && (
                      <span className="text-xs text-muted-foreground">{dlInfo.speed}</span>
                    )}
                  </div>
                )}
                {isInstallError && (
                  <Badge variant="destructive" className="text-xs h-4 px-1">
                    {t('installError')}
                  </Badge>
                )}
              </div>
              {isActive && dlInfo && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5">
                  <Progress value={dlInfo.progress} className="h-0.5" aria-label="Download progress" />
                </div>
              )}
            </div>
          )
        }
      },
      {
        accessorKey: 'version',
        header: () => t('version'),
        size: COLUMN_WIDTHS.VERSION,
        enableResizing: true,
        cell: ({ row }) => {
          const listV = row.original.version
          const devV = row.original.deviceVersionCode
          return (
            <div className="flex flex-col justify-center">
              <span className="text-sm text-foreground">{listV ? `v${listV}` : '-'}</span>
              {row.original.isInstalled && (
                <span className="text-xs text-muted-foreground">
                  {devV !== undefined ? `Installed: v${devV}` : 'Installed'}
                </span>
              )}
            </div>
          )
        }
      },
      {
        accessorKey: 'downloads',
        header: () => t('popularity'),
        size: COLUMN_WIDTHS.POPULARITY,
        enableResizing: true,
        cell: (info) => {
          const count = info.getValue()
          return (
            <span className="text-sm text-foreground">
              {typeof count === 'number' ? count.toLocaleString() : '-'}
            </span>
          )
        }
      },
      {
        accessorKey: 'size',
        header: () => t('size'),
        size: COLUMN_WIDTHS.SIZE,
        enableResizing: true,
        sortingFn: (a, b) =>
          parseSizeBytes(a.original.size ?? '') - parseSizeBytes(b.original.size ?? ''),
        cell: (info) => {
          const s = String(info.getValue() || '')
          if (s === '0 MB' || !s.trim()) return null
          return <span className="text-sm text-foreground">{s}</span>
        }
      },
      {
        accessorKey: 'lastUpdated',
        header: () => t('lastUpdated'),
        size: COLUMN_WIDTHS.LAST_UPDATED,
        enableResizing: true,
        sortingFn: (a, b) => {
          const da = a.original.lastUpdated ? new Date(a.original.lastUpdated).getTime() : 0
          const db = b.original.lastUpdated ? new Date(b.original.lastUpdated).getTime() : 0
          return da - db
        },
        cell: (info) => (
          <span className="text-sm text-foreground">{String(info.getValue() || '-')}</span>
        )
      },
      {
        accessorKey: 'isInstalled',
        header: 'Installed',
        enableResizing: false
      },
      {
        accessorKey: 'hasUpdate',
        header: 'Update',
        enableResizing: false
      }
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableWidth, t])

  // ── Filtered games ───────────────────────────────────────────────────────
  const filteredGames = useMemo(() => {
    let hideAdult = true
    try {
      hideAdult = localStorage.getItem('vrcyberdeck:hideAdult') !== 'false'
    } catch { /* ignore */ }
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

  // ── Card-sorted games ────────────────────────────────────────────────────
  const cardSortedGames = useMemo(() => {
    const sorted = [...filteredGames]
    const key = prefs.cardSortKey as keyof GameInfo | ''
    if (!key) return sorted
    sorted.sort((a, b) => {
      const av = a[key] ?? ''
      const bv = b[key] ?? ''
      if (key === 'size')
        return parseSizeBytes(String(av)) - parseSizeBytes(String(bv))
      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      return String(av).localeCompare(String(bv))
    })
    if (prefs.cardSortDir === 'desc') sorted.reverse()
    return sorted
  }, [filteredGames, prefs.cardSortKey, prefs.cardSortDir])

  // ── TanStack table ───────────────────────────────────────────────────────
  const table = useReactTable({
    data: filteredGames,
    columns,
    columnResizeMode: 'onChange',
    filterFns: { gameNameAndPackageFilter: filterGameNameAndPackage },
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
        setPrefs({ tableSortKey: first?.id ?? '', tableSortDir: first?.desc ? 'desc' : 'asc' })
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

  const displayedCount = table.getFilteredRowModel().rows.length

  // ── Sync time format ─────────────────────────────────────────────────────
  const formatDate = (date: Date | null): string => {
    if (!date) return t('never')
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getProcessMessage = (): string => {
    if (downloadProgress > 0 && downloadProgress < 100)
      return `${t('downloadingGameData')} ${downloadProgress}%`
    if (extractProgress > 0 && extractProgress < 100)
      return `${t('extractingGameData')} ${extractProgress}%`
    if (loadingGames) return t('preparingLibrary')
    return ''
  }

  const getCurrentProgress = (): number => {
    if (downloadProgress > 0 && downloadProgress < 100) return downloadProgress
    if (extractProgress > 0 && extractProgress < 100) return extractProgress
    return 0
  }

  // ── Dialog open / close ──────────────────────────────────────────────────
  const handleRowClick = (_event: React.MouseEvent, row: Row<GameInfo>): void => {
    setDialogGame(row.original)
    setIsDialogOpen(true)
  }

  const handleCardClick = (game: GameInfo): void => {
    setDialogGame(game)
    setIsDialogOpen(true)
  }

  useEffect(() => {
    if (dialogGame) setIsDialogOpen(true)
  }, [dialogGame])

  const handleCloseDialog = useCallback((): void => {
    setIsDialogOpen(false)
    setTimeout(() => { setDialogGame(null) }, 300)
  }, [setDialogGame])

  // ── Action handlers ──────────────────────────────────────────────────────
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
      const uninstallOk = await window.api.adb.uninstallPackage(selectedDevice, game.packageName)
      if (uninstallOk) {
        const dlInfo = downloadStatusMap.get(game.releaseName)
        if (dlInfo?.status === 'Completed') {
          await window.api.downloads.installFromCompleted(game.releaseName, selectedDevice)
        } else {
          const ok = await addDownloadToQueue(game)
          if (!ok) window.alert(`Reinstall for ${game.name} failed: Could not add to download queue.`)
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
      const dlInfo = downloadStatusMap.get(game.releaseName)
      if (dlInfo?.status === 'Completed') {
        await window.api.downloads.installFromCompleted(game.releaseName, selectedDevice)
      } else {
        const ok = await addDownloadToQueue(game)
        if (!ok) window.alert(`Could not queue ${game.name} for update.`)
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
        const ok = await deleteFiles(game.releaseName)
        if (!ok) window.alert('Failed to delete downloaded files.')
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
        let itemName = ''
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
        setInstallStatusMessage(`Installing ${itemName}: ${fileName}…`)
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
        const pkgs = await window.api.adb.getInstalledPackages(selectedDevice)
        if (!pkgs.find((p) => p.packageName === folderName)) {
          setObbFolderToConfirm(folderPath)
          setShowObbConfirmDialog(true)
          return
        }
      } catch {
        const proceed = window.confirm(
          `Could not verify installed packages. Proceed copying "${folderName}" to OBB directory?`
        )
        if (!proceed) return
      }
      await performObbCopy(folderPath)
    } catch (error) {
      console.error('Error during OBB folder copy:', error)
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
      setInstallStatusMessage(`Copying OBB folder: ${folderName}…`)
      setInstallSuccess(null)
      try {
        const success = await window.api.downloads.copyObbFolder(folderPath, selectedDevice)
        setInstallSuccess(success)
        if (success) {
          setInstallStatusMessage(`"${folderName}" copied to OBB directory successfully!`)
        } else {
          setInstallStatusMessage(`Failed to copy "${folderName}" to OBB directory`)
        }
      } catch {
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
  const processMsg = getProcessMessage()
  const processProgress = getCurrentProgress()
  const noSideload = getSideloadingDisabled()

  // ── Card size ────────────────────────────────────────────────────────────
  const cardMinSize = 180
  const cardMaxSize = 300
  const cardSize = Math.round(cardMinSize + (prefs.cardSize / 100) * (cardMaxSize - cardMinSize))

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border shrink-0">

        {/* Row 1: title + meta + device chip */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <LibraryBig className="h-5 w-5 text-muted-foreground shrink-0" />
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <span className="text-sm text-muted-foreground">
            {displayedCount.toLocaleString()} of {counts.total.toLocaleString()}
          </span>
          {lastSyncTime && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              · Synced {formatDate(lastSyncTime)}
            </span>
          )}

          {/* Sync progress inline */}
          {processMsg && (
            <span className="text-xs text-primary flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {processMsg}
            </span>
          )}

          <div className="ml-auto">
            <ConnectedDeviceChip
              selectedDeviceDetails={selectedDeviceDetails}
              isConnected={isConnected}
              isBusy={isBusy}
              onDisconnect={disconnectDevice}
              onRefreshPackages={() =>
                loadPackages().catch((e) => console.error('Refresh packages error:', e))
              }
              onAdbShell={() => setShellDialogOpen(true)}
              t={t}
            />
          </div>
        </div>

        {/* Progress bar when syncing */}
        {processMsg && processProgress > 0 && (
          <Progress value={processProgress} className="h-0.5 rounded-none" aria-label="Sync progress" />
        )}

        {/* Row 2: toolbar */}
        <div className="flex items-center gap-2 px-4 pb-2 pt-1 flex-wrap">

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8 h-8 text-sm pr-7"
              placeholder="Search games…"
              value={searchInput}
              onChange={handleSearchChange}
              aria-label="Search games"
            />
            {searchInput && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={handleSearchClear}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <Tabs
            value={activeFilter}
            onValueChange={(v) => setActiveFilter(v as FilterType)}
          >
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-7 px-3">
                All
                <Badge variant="secondary" className="ml-1.5 text-xs px-1 py-0 h-4">
                  {counts.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="installed" className="text-xs h-7 px-3">
                Installed
                {counts.installed > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs px-1 py-0 h-4">
                    {counts.installed}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="update" className="text-xs h-7 px-3">
                Updates
                {counts.updates > 0 && (
                  <Badge className="ml-1.5 text-xs px-1 py-0 h-4 bg-amber-500/15 text-amber-500 border-amber-500/30 border">
                    {counts.updates}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category select */}
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Category filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All content</SelectItem>
              <SelectItem value="non-adult">Safe only</SelectItem>
              <SelectItem value="adult">Adult only</SelectItem>
            </SelectContent>
          </Select>

          {/* View toggle */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setPrefs({ viewMode: prefs.viewMode === 'table' ? 'cards' : 'table' })
            }
            aria-label={prefs.viewMode === 'table' ? 'Switch to card view' : 'Switch to table view'}
          >
            {prefs.viewMode === 'table' ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <Table2 className="h-4 w-4" />
            )}
          </Button>

          {/* Display options popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Display options"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              <DisplayOptionsContent
                prefs={prefs}
                setPrefs={setPrefs}
                setSorting={setSorting}
              />
            </PopoverContent>
          </Popover>

          {/* More dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() =>
                  refreshGames().catch((e) => console.error('Refresh games error:', e))
                }
                disabled={isBusy}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh games
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowMirrorMgmt(true)}>
                <Globe className="h-4 w-4 mr-2" />
                Manage mirrors
              </DropdownMenuItem>
              {!noSideload && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleManualInstall('apk')}
                    disabled={!isConnected || isBusy}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Manual install (APK)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleCopyObbFolder()}
                    disabled={!isConnected || isBusy}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Copy OBB folder
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShellDialogOpen(true)}
                disabled={!isConnected}
              >
                <Terminal className="h-4 w-4 mr-2" />
                ADB shell
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={disconnectDevice}
                disabled={!isConnected}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect device
              </DropdownMenuItem>
              {isUsingVrSrcEndpoint && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      requestUploadCheck()
                      setShowUploadGames(true)
                    }}
                    disabled={!isConnected}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload games to server
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto"
        style={{ contain: 'strict' }}
      >
        {prefs.viewMode === 'cards' ? (
          /* Card grid */
          <div
            className="p-4"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`,
              gap: '1rem'
            }}
          >
            {cardSortedGames.map((game) => {
              const dlInfo = game.releaseName
                ? downloadStatusMap.get(game.releaseName)
                : undefined
              return (
                <Card
                  key={game.id}
                  className="overflow-hidden cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleCardClick(game)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full bg-muted overflow-hidden">
                    <img
                      src={game.thumbnailPath ? `file://${game.thumbnailPath}` : placeholderImage}
                      alt={game.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Status overlay badge */}
                    <div className="absolute top-2 right-2">
                      {game.isInstalled && !game.hasUpdate && (
                        <Badge className="bg-emerald-500/80 text-white border-0 text-xs">
                          Installed
                        </Badge>
                      )}
                      {game.hasUpdate && (
                        <Badge className="bg-amber-500/80 text-white border-0 text-xs">
                          Update
                        </Badge>
                      )}
                      {dlInfo?.status === 'Completed' && !game.isInstalled && (
                        <Badge variant="secondary" className="text-xs">
                          Downloaded
                        </Badge>
                      )}
                    </div>
                    {/* Download progress bar */}
                    {(dlInfo?.status === 'Downloading' ||
                      dlInfo?.status === 'Extracting' ||
                      dlInfo?.status === 'Installing') && (
                      <div className="absolute bottom-0 left-0 right-0">
                        <Progress
                          value={dlInfo.progress}
                          className="h-1 rounded-none"
                          aria-label="Download progress"
                        />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 space-y-1">
                    <p className="text-sm font-semibold line-clamp-2 leading-tight">
                      {game.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {game.version ? `v${game.version}` : game.packageName}
                    </p>
                  </CardContent>
                </Card>
              )
            })}

            {cardSortedGames.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
                <LibraryBig className="h-12 w-12 opacity-20" />
                <p className="text-sm">No games found</p>
              </div>
            )}
          </div>
        ) : (
          /* Virtualized table */
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sortDir = header.column.getIsSorted()
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={`text-xs text-muted-foreground font-medium py-2 ${canSort ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <span className="flex items-center gap-1">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && !sortDir && (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                          {sortDir === 'asc' && <ChevronUp className="h-3 w-3" />}
                          {sortDir === 'desc' && <ChevronDown className="h-3 w-3" />}
                        </span>
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative'
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index]
                if (!row) return null
                const isEven = virtualRow.index % 2 === 0
                return (
                  <TableRow
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      backgroundColor:
                        prefs.alternatingRows
                          ? isEven
                            ? prefs.evenRowColor
                            : prefs.oddRowColor
                          : undefined
                    }}
                    className="cursor-pointer hover:bg-accent border-b border-border/50 transition-colors"
                    onClick={(e) => handleRowClick(e, row)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                          maxWidth: cell.column.getSize(),
                          paddingTop: 'var(--row-pad-v, 8px)',
                          paddingBottom: 'var(--row-pad-v, 8px)'
                        }}
                        className="overflow-hidden"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────── */}

      {/* Game details dialog */}
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
        onDeleteDownloaded={(g) => handleDeleteDownloaded(g)}
        onInstallFromCompleted={handleInstallFromCompleted}
        getNote={getNote}
        isConnected={isConnected}
        isBusy={isBusy}
      />

      {/* ADB shell */}
      {shellDialogOpen && selectedDevice && (
        <AdbShellDialog
          deviceId={selectedDevice}
          isOpen={shellDialogOpen}
          onDismiss={() => setShellDialogOpen(false)}
        />
      )}

      {/* Mirror management */}
      {showMirrorMgmt && <MirrorManagement />}

      {/* LocalUploadDialog is self-contained (Fluent, off-limits). Always mount it; its trigger button is
          visually hidden here, but the dialog itself can be opened programmatically via the
          Fluent component's internal state (click the hidden button) or via its Portal. */}
      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        <LocalUploadDialog />
      </div>

      {/* Upload games */}
      {showUploadGames && <UploadGamesDialog />}

      {/* Manual install result dialog */}
      {showInstallDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-80 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {isManualInstalling ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : installSuccess === true ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <X className="h-4 w-4 text-destructive" />
                )}
                <p className="text-sm font-medium">
                  {isManualInstalling ? 'Installing…' : installSuccess ? 'Done' : 'Failed'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{installStatusMessage}</p>
              {!isManualInstalling && (
                <Button size="sm" variant="outline" onClick={closeInstallDialog}>
                  Close
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* OBB confirm dialog */}
      {showObbConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-96 p-4">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Copy OBB folder?</p>
              <p className="text-xs text-muted-foreground">
                The folder name doesn't match any installed package. Are you sure you want to
                copy it to the OBB directory?
              </p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={handleObbCancelCopy}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => void handleObbConfirmCopy()}>
                  Copy anyway
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── Display options popover content ─────────────────────────────────────────
interface DisplayOptionsContentProps {
  prefs: ReturnType<typeof useTablePreferences>['prefs']
  setPrefs: ReturnType<typeof useTablePreferences>['setPrefs']
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>
}

const DisplayOptionsContent: React.FC<DisplayOptionsContentProps> = ({
  prefs,
  setPrefs,
  setSorting
}) => {
  if (prefs.viewMode === 'cards') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold">Card view options</p>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Card size</p>
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
          <p className="text-xs text-muted-foreground mb-2">Sort by</p>
          <div className="flex gap-2">
            <select
              value={prefs.cardSortKey}
              onChange={(e) => {
                const key = e.target.value
                setPrefs({ cardSortKey: key })
                setSorting(key ? [{ id: key, desc: prefs.cardSortDir === 'desc' }] : [])
              }}
              className="flex-1 bg-muted text-foreground border border-border rounded-md text-xs px-2 py-1.5"
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
              className="bg-muted border border-border rounded-md text-xs text-foreground px-2 py-1.5 hover:bg-accent transition-colors"
            >
              {prefs.cardSortDir === 'asc' ? '▲ Asc' : '▼ Desc'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold">Display options</p>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Row density</p>
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
        <p className="text-xs text-muted-foreground">Alternating rows</p>
        <Switch
          checked={prefs.alternatingRows}
          onCheckedChange={(checked) => setPrefs({ alternatingRows: checked })}
        />
      </div>
    </div>
  )
}

export default GamesView
