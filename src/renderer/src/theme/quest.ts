/**
 * Quest design tokens — single source of truth for the new HeroUI-based UI.
 *
 * The redesign subagents should import these constants (or reference the
 * matching Tailwind class names) instead of re-deriving Quest colors per file.
 * HeroUI's theme already has them mapped in `tailwind.config.cjs` under the
 * "quest" theme, so most consumers will use Tailwind utility classes
 * (`bg-content1`, `text-default-500`, `text-primary`, `rounded-large`, etc.).
 *
 * These literal values are only here for places that need an inline JS value
 * (e.g. a chart series color, a canvas paint, a framer-motion variant).
 */

export const questColors = {
  bg: '#15161A',
  bgRaised: '#1C1E23',
  surface: '#25272D',
  surfaceHover: '#2D2F36',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',
  text: 'rgba(255, 255, 255, 0.92)',
  textMuted: 'rgba(255, 255, 255, 0.62)',
  textDim: 'rgba(255, 255, 255, 0.38)',
  primary: '#3D7DFF',
  primaryHover: '#5390FF',
  success: '#2ED47A',
  warning: '#FFB547',
  danger: '#FF6B6B'
} as const

export const questRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  pill: '999px'
} as const

export const questShadow = {
  1: '0 1px 2px rgba(0, 0, 0, 0.35)',
  2: '0 4px 16px rgba(0, 0, 0, 0.45)',
  3: '0 12px 48px rgba(0, 0, 0, 0.5)'
} as const

export const questFont = {
  sans:
    "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"
} as const

export const questMotion = {
  durFast: 0.12,
  durBase: 0.18,
  durSlow: 0.28,
  ease: [0.32, 0.72, 0, 1] as const // Apple-like custom cubic
} as const
