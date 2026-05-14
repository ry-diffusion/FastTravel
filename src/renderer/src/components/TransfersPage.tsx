import React, { useState } from 'react'
import { Tabs, Tab, Chip } from '@heroui/react'
import { useUpload } from '@renderer/hooks/useUpload'
import DownloadsView from './DownloadsView'
import UploadsView from './UploadsView'

const TAB_STORAGE_KEY = 'vrcyberdeck:transfersTab'

type TransferTab = 'downloads' | 'uploads'

const TransfersPage: React.FC = () => {
  const [tab, setTab] = useState<TransferTab>(() => {
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
    const next = key as TransferTab
    setTab(next)
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Page header */}
      <header className="px-8 py-6 flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Transfers</h1>
        <p className="text-sm text-default-500 mt-1">Downloads and uploads queued on this device.</p>
      </header>

      {/* Tab bar */}
      <div className="px-8 border-b border-divider flex-shrink-0">
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

      {/* Body */}
      <div className="flex-1 overflow-auto px-8 pb-8 pt-6">
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
