import React from 'react'
import ReactDOM from 'react-dom/client'
import { HeroUIProvider } from '@heroui/react'
import App from './App'
import './assets/tailwind.css'
import './assets/index.css'
import log from 'electron-log/renderer'

Object.assign(console, log.functions)
log.errorHandler.startCatching()

// Activate the Quest HeroUI theme (registered in tailwind.config.cjs).
// HeroUI's themed CSS variables are scoped under .quest only — the .dark
// class is also added so Tailwind's `dark:` variants work consistently.
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('quest')
  document.documentElement.classList.add('dark')
  document.body.classList.add('bg-background', 'text-foreground')
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  </React.StrictMode>
)
