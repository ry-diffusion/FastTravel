import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/tailwind.css'
import './assets/index.css'
import { Toaster } from './components/ui/sonner'
import log from 'electron-log/renderer'

Object.assign(console, log.functions)
log.errorHandler.startCatching()

if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark')
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>
)
