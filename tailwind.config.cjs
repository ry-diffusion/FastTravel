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
      themes: {
        // Meta Quest-inspired dark theme. Tuned to match Horizon OS:
        // dark slate surfaces, Quest blue primary, neutral grays.
        quest: {
          extend: 'dark',
          colors: {
            background: '#15161A',
            foreground: '#F5F5F7',
            divider: 'rgba(255, 255, 255, 0.08)',
            focus: '#3D7DFF',
            content1: '#1C1E23',
            content2: '#25272D',
            content3: '#2D2F36',
            content4: '#36383F',
            default: {
              50: '#0F1014',
              100: '#15161A',
              200: '#1C1E23',
              300: '#25272D',
              400: '#36383F',
              500: '#52555E',
              600: '#7B7E88',
              700: '#A4A6AE',
              800: '#CECFD4',
              900: '#F5F5F7',
              DEFAULT: '#25272D',
              foreground: '#F5F5F7'
            },
            primary: {
              50: '#E8F0FF',
              100: '#C5D8FF',
              200: '#9BBBFF',
              300: '#719EFF',
              400: '#5390FF',
              500: '#3D7DFF',
              600: '#306BE6',
              700: '#2358CC',
              800: '#1745B3',
              900: '#0B3399',
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
