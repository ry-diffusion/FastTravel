import { useCallback, useEffect, useState } from 'react'

// ─── Storage keys ────────────────────────────────────────────────────────────
export const DISABLE_AUTO_UPDATE_KEY = 'vrcyberdeck:disableAutoUpdate'
export const FONT_SCALE_KEY = 'vrcyberdeck:fontScale'
export const DELETE_ON_REMOVE_KEY = 'vrcyberdeck:deleteOnRemove'
export const DISABLE_SIDELOADING_KEY = 'vrcyberdeck:disableSideloading'
export const COLORBLIND_MODE_KEY = 'vrcyberdeck:colorblindMode'
export const ACCENT_COLOR_KEY = 'vrcyberdeck:accentColor'
export const FONT_FAMILY_KEY = 'vrcyberdeck:fontFamily'

export type DeleteOnRemove = 'ask' | 'delete' | 'keep'

// ─── Font family options ─────────────────────────────────────────────────────
// Kept for backwards compatibility with the Settings UI — all four choices now
// map to clean Inter/SF-style sans stacks. The "Cyberpunk" / "Terminal" labels
// from the old theme are gone.
export type FontFamilyChoice = 'system' | 'inter' | 'rounded' | 'mono'

export const FONT_FAMILY_OPTIONS: Record<
  FontFamilyChoice,
  { label: string; stack: string; hint: string }
> = {
  system: {
    label: 'System',
    stack:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    hint: 'Native OS font — recommended.'
  },
  inter: {
    label: 'Inter',
    stack: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
    hint: 'The Inter family used across the Meta Quest UI.'
  },
  rounded: {
    label: 'Rounded',
    stack: "'SF Pro Rounded', 'Nunito', 'Inter', system-ui, sans-serif",
    hint: 'Softer rounded letterforms.'
  },
  mono: {
    label: 'Monospace',
    stack: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
    hint: 'Fixed-width — for command-line surfaces only.'
  }
}

const DEFAULT_FONT_FAMILY: FontFamilyChoice = 'system'

// ─── Readers (safe defaults) ────────────────────────────────────────────────
function readBool(key: string, defaultTrue = true): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return defaultTrue
    return v === 'true'
  } catch {
    return defaultTrue
  }
}

function readNumber(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

function readDeleteOnRemove(): DeleteOnRemove {
  try {
    const v = localStorage.getItem(DELETE_ON_REMOVE_KEY)
    if (v === 'delete' || v === 'keep' || v === 'ask') return v
  } catch { /* ignore */ }
  return 'ask'
}

export function getDeleteOnRemove(): DeleteOnRemove {
  return readDeleteOnRemove()
}

export function getSideloadingDisabled(): boolean {
  return readBool(DISABLE_SIDELOADING_KEY, false)
}

export function getColorblindMode(): boolean {
  return readBool(COLORBLIND_MODE_KEY, false)
}

export function getAccentColor(): string | null {
  try {
    return localStorage.getItem(ACCENT_COLOR_KEY)
  } catch {
    return null
  }
}

export function getFontFamilyChoice(): FontFamilyChoice {
  try {
    const v = localStorage.getItem(FONT_FAMILY_KEY)
    if (v && v in FONT_FAMILY_OPTIONS) return v as FontFamilyChoice
  } catch { /* ignore */ }
  return DEFAULT_FONT_FAMILY
}

export function applyFontFamily(choice: FontFamilyChoice): void {
  try {
    const stack = FONT_FAMILY_OPTIONS[choice]?.stack ?? FONT_FAMILY_OPTIONS[DEFAULT_FONT_FAMILY].stack
    document.documentElement.style.setProperty('--quest-font-sans', stack)
    document.documentElement.style.setProperty('--vrcd-font-mono', stack)
  } catch { /* ignore */ }
}

// Convert "#RRGGBB" → "R, G, B" raw triple for use in rgba()
function hexToRgbRaw(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

export function applyAccentColor(hex: string | null): void {
  try {
    const root = document.documentElement
    if (!hex) {
      root.style.removeProperty('--vrcd-neon')
      root.style.removeProperty('--vrcd-neon-raw')
      return
    }
    const raw = hexToRgbRaw(hex)
    if (!raw) return
    root.style.setProperty('--vrcd-neon', hex)
    root.style.setProperty('--vrcd-neon-raw', raw)
  } catch { /* ignore */ }
}

export function isAutoUpdateDisabled(): boolean {
  return readBool(DISABLE_AUTO_UPDATE_KEY, false)
}

export function getFontScale(): number {
  const n = readNumber(FONT_SCALE_KEY, 1)
  return Math.max(0.75, Math.min(2.0, n))
}

// ─── React hook for Settings UI ─────────────────────────────────────────────
export interface ExtrasSettings {
  disableAutoUpdate: boolean
  fontScale: number
  deleteOnRemove: DeleteOnRemove
  disableSideloading: boolean
  colorblindMode: boolean
  accentColor: string | null
  fontFamily: FontFamilyChoice
  setDisableAutoUpdate: (v: boolean) => void
  setFontScale: (v: number) => void
  setDeleteOnRemove: (v: DeleteOnRemove) => void
  setDisableSideloading: (v: boolean) => void
  setColorblindMode: (v: boolean) => void
  setAccentColor: (v: string | null) => void
  setFontFamily: (v: FontFamilyChoice) => void
}

export function useExtrasSettings(): ExtrasSettings {
  const [disableAutoUpdate, setDisableAutoUpdateState] = useState<boolean>(() => readBool(DISABLE_AUTO_UPDATE_KEY, false))
  const [fontScale, setFontScaleState] = useState<number>(() => getFontScale())
  const [deleteOnRemove, setDeleteOnRemoveState] = useState<DeleteOnRemove>(readDeleteOnRemove)
  const [disableSideloading, setDisableSideloadingState] = useState<boolean>(() => readBool(DISABLE_SIDELOADING_KEY, false))
  const [colorblindMode, setColorblindModeState] = useState<boolean>(() => readBool(COLORBLIND_MODE_KEY, false))
  const [accentColor, setAccentColorState] = useState<string | null>(() => getAccentColor())
  const [fontFamily, setFontFamilyState] = useState<FontFamilyChoice>(() => getFontFamilyChoice())

  const persistBool = (key: string, value: boolean): void => {
    try { localStorage.setItem(key, String(value)) } catch { /* ignore */ }
  }

  const persistNumber = (key: string, value: number): void => {
    try { localStorage.setItem(key, String(value)) } catch { /* ignore */ }
  }

  const setDisableAutoUpdate = useCallback((v: boolean) => { setDisableAutoUpdateState(v); persistBool(DISABLE_AUTO_UPDATE_KEY, v) }, [])
  const setFontScale = useCallback((v: number) => {
    const clamped = Math.max(0.75, Math.min(2.0, v))
    setFontScaleState(clamped)
    persistNumber(FONT_SCALE_KEY, clamped)
    try { window.api.app.setZoomFactor(clamped) } catch { /* ignore */ }
  }, [])
  const setDeleteOnRemove = useCallback((v: DeleteOnRemove) => {
    setDeleteOnRemoveState(v)
    try { localStorage.setItem(DELETE_ON_REMOVE_KEY, v) } catch { /* ignore */ }
  }, [])
  const setDisableSideloading = useCallback((v: boolean) => {
    setDisableSideloadingState(v)
    persistBool(DISABLE_SIDELOADING_KEY, v)
    try {
      window.api.downloads.setSideloadingDisabled(v)
    } catch { /* ignore */ }
  }, [])
  const setColorblindMode = useCallback((v: boolean) => {
    setColorblindModeState(v)
    persistBool(COLORBLIND_MODE_KEY, v)
    try {
      if (v) document.documentElement.classList.add('vrcd-colorblind')
      else document.documentElement.classList.remove('vrcd-colorblind')
    } catch { /* ignore */ }
  }, [])
  const setAccentColor = useCallback((v: string | null) => {
    setAccentColorState(v)
    try {
      if (v === null) localStorage.removeItem(ACCENT_COLOR_KEY)
      else localStorage.setItem(ACCENT_COLOR_KEY, v)
    } catch { /* ignore */ }
    applyAccentColor(v)
  }, [])
  const setFontFamily = useCallback((v: FontFamilyChoice) => {
    setFontFamilyState(v)
    try { localStorage.setItem(FONT_FAMILY_KEY, v) } catch { /* ignore */ }
    applyFontFamily(v)
  }, [])

  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--vrcd-font-scale', String(fontScale))
    } catch { /* ignore */ }
  }, [fontScale])

  useEffect(() => {
    try {
      const root = document.documentElement
      if (colorblindMode) {
        root.classList.add('vrcd-colorblind')
      } else {
        root.classList.remove('vrcd-colorblind')
        applyAccentColor(accentColor)
      }
    } catch { /* ignore */ }
  }, [colorblindMode, accentColor])

  return {
    disableAutoUpdate, fontScale, deleteOnRemove, disableSideloading, colorblindMode, accentColor, fontFamily,
    setDisableAutoUpdate, setFontScale, setDeleteOnRemove, setDisableSideloading, setColorblindMode, setAccentColor, setFontFamily
  }
}

// Apply font scale / accent / font on initial module load
try {
  const initial = getFontScale()
  document.documentElement.style.setProperty('--vrcd-font-scale', String(initial))
  window.api.app.setZoomFactor(initial)
} catch { /* ignore */ }

try {
  if (getColorblindMode()) {
    document.documentElement.classList.add('vrcd-colorblind')
  }
} catch { /* ignore */ }

try {
  applyFontFamily(getFontFamilyChoice())
} catch { /* ignore */ }

try {
  applyAccentColor(getAccentColor())
} catch { /* ignore */ }

try {
  window.api.downloads.setSideloadingDisabled(getSideloadingDisabled())
} catch { /* ignore */ }
