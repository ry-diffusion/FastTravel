import React, { useState } from 'react'
import { useUpload } from '@renderer/hooks/useUpload'
import DownloadsView from './DownloadsView'
import UploadsView from './UploadsView'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@renderer/components/ui/tabs'
import { Badge } from '@renderer/components/ui/badge'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAB_STORAGE_KEY = 'vrcyberdeck:transfersTab'
type TransferTab = 'downloads' | 'uploads'

function readTab(): TransferTab {
  try {
    const v = localStorage.getItem(TAB_STORAGE_KEY)
    return v === 'uploads' ? 'uploads' : 'downloads'
  } catch {
    return 'downloads'
  }
}

function writeTab(tab: TransferTab): void {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// TransfersPage
// ---------------------------------------------------------------------------

const TransfersPage: React.FC = () => {
  const [tab, setTab] = useState<TransferTab>(readTab)

  const { queue: uploadQueue } = useUpload()
  const activeUploads = uploadQueue.filter(
    (i) =>
      i.status === 'Queued' ||
      i.status === 'Preparing' ||
      i.status === 'Uploading'
  ).length

  const handleTabChange = (value: string): void => {
    const next = value as TransferTab
    setTab(next)
    writeTab(next)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Page header */}
      <header className="px-8 pt-8 pb-4 flex-shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Transfers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Downloads and uploads queued on this device.
        </p>
      </header>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex flex-col flex-1 overflow-hidden px-8"
      >
        <TabsList className="w-fit mb-4 flex-shrink-0">
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
          <TabsTrigger value="uploads" className="flex items-center gap-1.5">
            Uploads
            {activeUploads > 0 && (
              <Badge
                variant="secondary"
                className="h-4 min-w-4 px-1 text-[10px] leading-none"
              >
                {activeUploads}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="downloads"
          className="flex-1 overflow-y-auto mt-0 focus-visible:outline-none"
        >
          <DownloadsView onClose={() => { /* navigation handled by parent */ }} />
        </TabsContent>

        <TabsContent
          value="uploads"
          className="flex-1 overflow-y-auto mt-0 focus-visible:outline-none"
        >
          <UploadsView />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TransfersPage
