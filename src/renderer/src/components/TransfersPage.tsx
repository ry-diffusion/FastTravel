import React, { useState } from 'react'
import { useUpload } from '@renderer/hooks/useUpload'
import DownloadsView from './DownloadsView'
import UploadsView from './UploadsView'

type Tab = 'downloads' | 'uploads'

const TAB_STORAGE_KEY = 'vrcyberdeck:transfersTab'

const TransfersPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const v = localStorage.getItem(TAB_STORAGE_KEY)
      return v === 'uploads' ? 'uploads' : 'downloads'
    } catch {
      return 'downloads'
    }
  })

  const { queue: uploadQueue } = useUpload()
  const activeUploads = uploadQueue.filter(
    (i) => i.status === 'Queued' || i.status === 'Preparing' || i.status === 'Uploading'
  ).length

  const switchTab = (next: Tab): void => {
    setTab(next)
    try { localStorage.setItem(TAB_STORAGE_KEY, next) } catch { /* ignore */ }
  }

  return (
    <div className="quest-page">
      <header className="quest-page__header">
        <div>
          <h1 className="quest-page__title">Transfers</h1>
          <p className="quest-page__subtitle">Downloads and uploads queued on this device.</p>
        </div>
      </header>

      <div className="quest-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'downloads'}
          className={`quest-tabs__tab${tab === 'downloads' ? ' is-active' : ''}`}
          onClick={() => switchTab('downloads')}
          type="button"
        >
          Downloads
        </button>
        <button
          role="tab"
          aria-selected={tab === 'uploads'}
          className={`quest-tabs__tab${tab === 'uploads' ? ' is-active' : ''}`}
          onClick={() => switchTab('uploads')}
          type="button"
        >
          Uploads
          {activeUploads > 0 && <span className="quest-tabs__badge">{activeUploads}</span>}
        </button>
      </div>

      <div className="quest-page__body">
        {tab === 'downloads' ? (
          <DownloadsView onClose={() => { /* sidebar handles navigation */ }} />
        ) : (
          <UploadsView />
        )}
      </div>
    </div>
  )
}

export default TransfersPage
