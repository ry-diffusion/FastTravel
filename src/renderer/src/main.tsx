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
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('quest', 'dark')
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  </React.StrictMode>
)
