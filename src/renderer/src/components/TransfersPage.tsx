import React, { useState } from 'react'
import { Tabs, Tab, Chip } from '@heroui/react'
import { useUpload } from '@renderer/hooks/useUpload'
import DownloadsView from './DownloadsView'
import UploadsView from './UploadsView'

const TAB_STORAGE_KEY = 'vrcyberdeck:transfersTab'

type Tab = 'downloads' | 'uploads'

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

  const handleTabChange = (key: React.Key): void => {
    const next = key as Tab
    setTab(next)
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="quest-page">
      <header className="quest-page__header">
        <div>
          <h1 className="quest-page__title">Transfers</h1>
          <p className="quest-page__subtitle">Downloads and uploads queued on this device.</p>
        </div>
      </header>

      <div className="px-9 border-b border-white/8">
        <Tabs
          selectedKey={tab}
          onSelectionChange={handleTabChange}
          variant="underlined"
          color="primary"
          classNames={{
            tabList: 'gap-6 p-0 border-none',
            tab: 'h-10 px-0 text-sm',
            cursor: 'hidden'
          }}
        >
          <Tab key="downloads" title="Downloads" />
          <Tab
            key="uploads"
            title={
              <div className="flex items-center gap-2">
                <span>Uploads</span>
                {activeUploads > 0 && (
                  <Chip size="sm" color="primary" variant="flat" className="h-4 min-w-4 text-xs">
                    {activeUploads}
                  </Chip>
                )}
              </div>
            }
          />
        </Tabs>
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
