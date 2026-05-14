/** @type {import('tailwindcss').Config} */
const { heroui } = require('@heroui/react')

module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        mono: [
          'ui-monospace',
          'SF Mono',
          'JetBrains Mono',
          'Menlo',
          'Consolas',
          'monospace'
        ]
      }
    }
  },
  plugins: [
    heroui({
      defaultTheme: 'quest',
      themes: {
        // ─── Meta Quest / Horizon OS-inspired dark theme ──────────────
        // Palette tuned for WCAG-AA contrast on the dark surfaces:
        //   default-500 (#A5A8B2) on background (#15161A) → 9.0:1
        //   default-400 (#8A8D97) on background (#15161A) → 6.4:1
        //   default-300 (#6B6E78) on background (#15161A) → 4.1:1
        //   foreground (#F5F5F7) on background (#15161A) → 14.9:1
        quest: {
          extend: 'dark',
          colors: {
            background: '#15161A',
            foreground: '#F5F5F7',
            divider: 'rgba(255, 255, 255, 0.10)',
            focus: '#3D7DFF',
            content1: '#1C1E23',
            content2: '#25272D',
            content3: '#2F3138',
            content4: '#3A3C44',
            default: {
              50: '#1C1E23',
              100: '#25272D',
              200: '#2F3138',
              300: '#3A3C44',
              400: '#8A8D97',
              500: '#A5A8B2',
              600: '#BEC0C8',
              700: '#D6D8DE',
              800: '#E8E9ED',
              900: '#F5F5F7',
              DEFAULT: '#25272D',
              foreground: '#F5F5F7'
            },
            primary: {
              50: '#0B1F3D',
              100: '#13305C',
              200: '#1B447F',
              300: '#2358CC',
              400: '#306BE6',
              500: '#3D7DFF',
              600: '#5390FF',
              700: '#719EFF',
              800: '#9BBBFF',
              900: '#C5D8FF',
              DEFAULT: '#3D7DFF',
              foreground: '#FFFFFF'
            },
            success: {
              DEFAULT: '#2ED47A',
              foreground: '#04210F'
            },
            warning: {
              DEFAULT: '#FFB547',
              foreground: '#2B1D05'
            },
            danger: {
              DEFAULT: '#FF6B6B',
              foreground: '#380A0A'
            }
          },
          layout: {
            radius: {
              small: '8px',
              medium: '12px',
              large: '16px'
            },
            fontSize: {
              tiny: '11px',
              small: '13px',
              medium: '14px',
              large: '16px'
            }
          }
        }
      }
    })
  ]
}
