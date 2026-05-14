# Fast Travel — UI SPEC (HeroUI / Meta Quest aesthetic)

This is the contract every redesign agent works against. **Read this fully before
writing any code.** Each per-surface section below tells you exactly what to
build, but every page must obey the shared rules in §1–§3.

---

## 1. Hard rules (apply to every page)

### Stack
- **Only `@heroui/react`** for UI components. No `@fluentui/react-components`, no
  `@fluentui/react-icons` imports in pages you own. Replace icons with
  [`lucide-react`](https://lucide.dev/) (already in HeroUI examples — install
  if missing: `npm install lucide-react`) or simple inline SVG. If `lucide-react`
  is missing from `package.json` after `cd`, install it before coding.
- **Tailwind utilities** for layout, spacing, sizing, simple text styles.
- **No CSS files**. Do not create or import `.css` files for your page. If your
  page used to import a CSS file (e.g. `device-list.css`), drop that import and
  delete the file in your worktree if it's unreferenced.
- **No `style={{}}` inline objects** except for one-off arbitrary values that
  Tailwind can't express (e.g. `gridTemplateColumns: '64px 1fr ...'`).
- **No `var(--vrcd-*)`**. Those variables remain in `src/renderer/src/assets/index.css`
  for legacy reasons but you must not reference them.

### Theme & contrast
- HeroUI theme `quest` is active (`<html class="quest dark">`). Use semantic
  HeroUI tokens:
  - Surfaces: `bg-background` (page), `bg-content1` (sidebar/cards), `bg-content2`
    (raised card on a card), `bg-content3` (hover state).
  - Borders: `border-divider`. For stronger separation use `border-default-100`.
  - Text:
    - Primary text → `text-foreground`
    - Secondary text → `text-default-500` (gray #A5A8B2 → 9:1 on bg, passes AAA)
    - Tertiary / disabled-ish → `text-default-400` (#8A8D97 → 6.4:1)
    - Don't use `text-default-300` or lower for body text — too low contrast.
  - Accent: `text-primary`, `bg-primary`, `border-primary`. Primary is Quest
    blue `#3D7DFF`.
  - Status: `text-success` (green), `text-warning` (amber), `text-danger` (red).
- **Every text label must hit WCAG-AA (4.5:1) minimum.** If you're tempted to
  use `text-default-300` (~3:1), pick `text-default-500` instead.

### Typography
- Sans-serif everywhere (Inter via the Tailwind `font-sans` default).
- **No monospace** except actual code/path strings.
- Sentence case headings. No ALL CAPS labels. No `tracking-wider` letterspacing
  on titles. No glow/text-shadow.
- Heading scale:
  - Page title: `text-2xl font-bold tracking-tight` (24px / 600+)
  - Section heading: `text-base font-semibold` (16px / 600)
  - Card heading: `text-sm font-semibold` (14px / 600)
  - Body: `text-sm` (14px / 400-500)
  - Caption / hint: `text-xs text-default-500` (12px)

### Motion
- HeroUI's built-in transitions are enough. Don't add custom keyframes.
- If you need motion, use `framer-motion` for fades / slides only.

### Behavior
- **Preserve every hook, IPC call, localStorage key, and prop signature**
  documented in your section. Behavior is the contract; visuals are yours.
- The redesign is renderer-only — never edit `src/main/*`, `src/preload/*`,
  `src/shared/*`, hooks (`src/renderer/src/hooks/*`), or contexts
  (`src/renderer/src/context/*`).

### Process (do this for every file you own)
1. `cd /home/zesmoi/src/FastTravel`.
2. **Delete** the existing file (`rm path/to/File.tsx`) before authoring the
   replacement. Treat it as a from-scratch implementation; do not read the
   old version's JSX. (You may still read sibling files to understand hook
   signatures.)
3. Write the new file using HeroUI + Tailwind only.
4. Verify `npx tsc --noEmit -p tsconfig.web.json` returns clean. The
   `gameService.ts` error in the node project is pre-existing and irrelevant.
5. `git add` + `git commit -m "..."` in your worktree.

---

## 2. HeroUI component cheat-sheet

| Need | Use |
|---|---|
| Page-level card | `Card` + `CardBody` (`bg-content1` for raised, `shadow="none"` if nested in a darker bg). |
| Primary action | `Button color="primary"`. |
| Secondary action | `Button variant="flat"` or `variant="bordered"`. |
| Destructive | `Button color="danger" variant="flat"` or `solid` for confirm. |
| Icon-only | `Button isIconOnly variant="light" size="sm" aria-label="..."`. |
| Toggle | `Switch` (with `size="md"` for visible track). |
| Single-select from a list | `Select` + `SelectItem`. |
| Number / discrete options group | `Tabs` (variant `solid` for segmented), OR `Select`. Never a row of "1 2 3 4 5 6" pill outlines. |
| Slider | `Slider` (with `marks` for labelled stops). |
| Status pill | `Chip size="sm" color="..." variant="flat"`. |
| Tabs | `Tabs variant="underlined" color="primary"`. |
| Modal | `Modal` + `ModalContent` + `ModalHeader/Body/Footer`. |
| Tooltip | `Tooltip`. |
| Avatar / image | `Avatar` for users, `Image` for game thumbnails. |
| Empty state | Plain `<div>` with centered icon + sentence-case message in `text-default-500`. |
| Loading | `Spinner` (size sm/md). |
| Progress bar | `Progress` (with `value` for determinate, `isIndeterminate` for not). |

Always pass `aria-label` on icon-only buttons and form controls without a
visible label.

---

## 3. Icons

Use `lucide-react`. Common ones:

| Concept | Lucide |
|---|---|
| Devices | `Headphones` or `Smartphone` |
| Library | `LibraryBig` |
| Transfers | `ArrowDownToLine` |
| Settings | `Settings` |
| Search | `Search` |
| Filter | `Filter` |
| Sort | `ArrowUpDown` |
| More menu | `MoreHorizontal` |
| Close | `X` |
| Battery | `BatteryMedium` (or full/low) |
| Wi-Fi | `Wifi` |
| USB | `Usb` |
| Refresh | `RefreshCw` |
| Pause | `Pause` |
| Play / resume | `Play` |
| Trash | `Trash2` |
| Folder | `Folder` |
| Theme | `Sun` / `Moon` |
| Info | `Info` |
| Help | `HelpCircle` |

Size 16–20 px in nav / buttons; pass via `size={N}` or wrap in
`<svg className="h-4 w-4" ...>`.

---

## 4. Per-surface specs

### 4.1 Sidebar — `src/renderer/src/components/Sidebar.tsx`

**Width** 256 px, full-height, `bg-content1`, right border `border-divider`.
Sticks to the left. Flex column.

**Layout (top → bottom):**
1. **Brand block** (top, ~64 px tall): `Avatar src={electronLogo} radius="md"
   size="sm"` + two stacked spans → "Fast Travel" (`text-sm font-bold`) /
   "Sideload manager" (`text-xs text-default-500`). Imports `electronLogo` from
   `'../assets/icon.svg'`.
2. **Primary nav** (Devices, Library): two `Button`-like items rendered as
   `<button>` with classes:
   - Base: `flex items-center gap-3 w-full px-3 py-2 rounded-medium text-sm font-medium transition-colors`
   - Inactive: `text-default-500 hover:bg-content2 hover:text-foreground`
   - Active: `bg-primary/15 text-primary` (icon also `text-primary`)
   - Each item has a 20px lucide icon + label + optional right-aligned
     `Chip size="sm" color="primary" variant="solid"` badge for counts.
3. `Divider` with `my-2`.
4. **Secondary nav** (Transfers — with badge from active queue count, Settings).
   Same item style as primary nav.
5. **Footer** (pushed to bottom with `mt-auto`):
   - Top border (`border-t border-divider pt-3`).
   - Status rows: `<dl>` with three rows (Server, Device, Library) — label on
     left in `text-xs text-default-500 font-medium`, value on right in
     `text-xs font-medium` colored by state:
     - Server online → `text-success`, offline → `text-warning`.
     - Device connected → `text-success`, otherwise → `text-default-500`.
     - Library → `text-default-700` (or `text-foreground`).
   - **Theme toggle row** — label "Dark mode" / "Light mode" (`text-xs
     text-default-500`) + a HeroUI `Switch` (`size="md" color="primary"`,
     `startContent={<Moon />}` and `endContent={<Sun />}` for clear visual
     state). The track MUST be visible in both states.
   - **Version row**: `<span class="text-xs text-default-500">v{appVersion} ·
     Made with ♥ by DMP</span>` + small icon-only `Button isIconOnly
     variant="light" size="sm" aria-label="Credits"` with a `HelpCircle`
     opening credits.

**Props:**
```ts
type SidebarView = 'devices' | 'library' | 'transfers' | 'settings'
interface SidebarProps {
  currentView: SidebarView
  onSelectView: (v: SidebarView) => void
  onOpenCredits: () => void
  appVersion: string
}
```
Hooks: `useAdb()` (`isConnected`, `selectedDeviceDetails`), `useGames()`
(`games`), `useSettings()` (`serverConfig`, `colorScheme`, `setColorScheme`),
`useDownload()` (`queue`), `useUpload()` (`queue`).

`activeTransfers` = downloads in Queued/Downloading/Extracting/Installing +
uploads in Queued/Preparing/Uploading. Show only if `> 0`.

---

### 4.2 AppLayout + chrome — `src/renderer/src/components/AppLayout.tsx`,
`TransferStrip.tsx`, `QuestLoader.tsx`

**AppLayout structure:**
- Wrap in providers (preserve the existing chain):
  ```
  <FluentProvider theme={...}>  // KEEP — Fluent is still used inside dialogs not in scope
    <AdbProvider>
      <GamesProvider>
        <GameDialogProvider>
          <root layout>
  ```
- Root layout = `flex h-screen w-screen bg-background text-foreground`.
- Left: `<Sidebar ... />`.
- Right: `<main class="flex-1 min-w-0 flex flex-col overflow-hidden">` →
  optional `<TransferStrip />` then `<MainContent ... />`.
- `MainContent` dispatches on `currentView`:
  - `DEVICE_LIST` → `<DeviceList ... />`
  - `GAMES` → `<GamesView ... />`
  - `TRANSFERS` → `<TransfersPage />`
  - `SETTINGS` → `<Settings />`
  - If dependencies not ready: render the bootstrap state — either the
    connectivity error block or `<QuestLoader title=... subtitle=...
    progress=... />`. Use HeroUI `Card` for the error block.
- Theme toggle in Sidebar drives `setColorScheme`. AppLayout syncs the html
  class:
  ```ts
  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorScheme === 'dark')
  }, [colorScheme])
  ```
  (Keep `.quest` always.)
- Close-confirm modal: HeroUI `Modal`.
- Render `<UpdateNotification />` and `<CreditsDialog ... />` near the bottom.
- Portal-parent div stays for legacy.

**TransferStrip** — collapse to `null` when idle. Otherwise:
- A compact strip `px-4 py-2 border-b border-divider bg-content1` with:
  - `Chip startContent={<ArrowDown/Up />} color="primary" variant="flat" size="sm"`.
  - Game name (truncated, `text-sm font-medium`).
  - Stage (`text-xs text-default-500`).
  - `Progress size="sm" color="primary" value={pct}` (`flex-1`).
  - Percentage on the right.
- Rotates through items every 4 s with the existing rotation logic.

**QuestLoader** — centered. Layout: `flex flex-col gap-6 max-w-[560px]`.
- `Progress` (indeterminate if `progress` is null, else value) — `size="sm" color="primary"`.
- Title `text-3xl font-bold tracking-tight`.
- Subtitle `text-base text-default-500`.

---

### 4.3 Devices page — `src/renderer/src/components/DeviceList.tsx`

**Default export `DeviceList`** with props
`{ onSkip?: () => void; onConnected?: () => void }`.

**Layout:**
- Outer: `flex h-full w-full items-center justify-center p-8 bg-background overflow-auto`.
- Inner card: HeroUI `Card` `radius="lg" shadow="md" className="w-full max-w-xl bg-content1"`.
- Header row inside `CardBody`: title "Devices" (`text-lg font-semibold`),
  small `Spinner size="sm" color="primary"` while loading, action buttons on
  the right:
  - `Button size="sm" variant="flat" onPress={refreshDevices}` "Scan" (loading
    state via `isLoading`).
  - If `onSkip` and not connected: `Button size="sm" variant="bordered"
    onPress={onSkip}` "Continue offline".
  - If `onSkip` and connected: `Button size="sm" color="primary"
    onPress={onSkip}` "Continue".
- Below header: error banner (only if `error`): `Card className="bg-danger/10
  border border-danger/30"` + danger text.
- "Add by IP" subsection: small label `text-xs font-medium text-default-500
  uppercase tracking-wide`, then a row of `Input size="sm" variant="bordered"
  placeholder="192.168.x.x"`, `Input` for port (default 5555, `w-24`),
  `Button size="sm" color="primary" onPress={...}` "Add".
- Device list: array of device cards rendered as `Card shadow="none"
  className="bg-content2"`. Each card:
  - Left: `Avatar` (rounded, `bg-primary/10 text-primary`) with a Lucide
    `Headphones` icon (Quest) or `Wifi` icon (Wi-Fi bookmark) inside.
  - Middle: name (sentence case, `text-sm font-medium`), then meta row of
    pieces separated by `·` in `text-xs text-default-500` — USB / Wi-Fi /
    IP / Battery % / Free storage / Ping latency in "12 ms · good".
  - Status `Chip size="sm" variant="flat" color={...}` — success/Connected,
    danger/Failed, primary/Connecting, warning/Unauthorized, default/Offline.
  - Right: action buttons:
    - Connected: `Button size="sm" color="primary" onPress={onOpenShell}`
      "Shell", `Button size="sm" variant="flat" onPress={onDisconnect}`
      "Disconnect".
    - Otherwise: `Button size="sm" color="primary" onPress={onConnect}`
      "Connect" + optional `Button size="sm" variant="flat"` "Save"
      (bookmark) or "Remove" (bookmark) etc.
- Empty state when no devices: centered icon + "No devices found" + secondary
  caption "Connect a headset over USB or add one by IP above.".
- Footer: when connected, a thin row at the bottom of the card with a small
  green dot + "Connected".
- Render `<AdbShellDialog deviceId={...} isOpen onDismiss />` at the end —
  controlled by `shellDialogDeviceId` state.

**Hooks/types:** `useAdb()` → `devices, isConnected, selectedDevice, error,
isLoading, connectToDevice, connectTcpDevice, disconnectTcpDevice,
refreshDevices, disconnectDevice`. `ExtendedDeviceInfo` from `@shared/types` —
fields are `id, type, friendlyModelName, (device as any).model,
(device as any).ipAddress, (device as any).batteryLevel,
(device as any).storageFree, (device as any).pingStatus,
(device as any).pingResponseTime, (device as any).isQuestDevice`, plus
`isWiFiBookmark(device)` / `hasBookmarkData(device)` from `@shared/types`.

Keep auto-connect to a Quest on discovery via `hasAutoConnected` ref.

---

### 4.4 Library page — `src/renderer/src/components/GamesView.tsx`,
`src/renderer/src/components/GameDetailsDialog.tsx`

**Default export `GamesView`** with props
`{ onBackToDevices, onTransfers, onSettings }`.

**Top of page = a single sticky header bar inside the page.** No left
sub-sidebar.

Header bar layout (`px-8 py-4 border-b border-divider`):
- Row 1: `<h1 class="text-2xl font-bold tracking-tight">Library</h1>` and a
  small `<span class="text-sm text-default-500">{game count, last sync time}</span>`
  on the right. Plus a `ConnectedDeviceChip` on the right edge (`Chip
  color="primary" variant="flat"` showing model + battery, opens a Popover
  with Disconnect / Refresh packages / ADB shell).
- Row 2: a flex row of toolbar controls (`gap-3`):
  - `Input` (`startContent={<Search />}`, `isClearable`, `size="sm"`,
    `placeholder="Search by name or package"`, `className="flex-1 max-w-md"`).
  - `Tabs` (`variant="solid" size="sm" color="primary"`) with three items All
    / Installed / Updates — each tab rendered with a small badge for count.
  - `Select size="sm"` (Category): All / Safe / Adult.
  - `Button isIconOnly variant="flat" size="sm" aria-label="Toggle view"`
    that flips between table icon and grid icon (toggles
    `prefs.viewMode`).
  - `Popover` triggered by `Button isIconOnly variant="flat" size="sm"
    aria-label="Display options"` with a `Sliders` icon — content:
    - In card mode: a `Slider` for card size, a `Select` for sort key, a
      `Button isIconOnly` for sort direction.
    - In table mode: a `Slider` for row density (50-100), a `Switch` for
      alternating rows, two row colour pickers (HeroUI doesn't ship a colour
      picker — use a small grid of `Button isIconOnly` swatches).
  - `Dropdown` ("More" menu) with `Button isIconOnly variant="flat" size="sm"
    aria-label="More"` and a `MoreHorizontal` icon. Items:
    - Refresh games
    - Manage mirrors → opens `<MirrorManagement>` (existing component)
    - Upload local files → opens `<LocalUploadDialog>` (existing component;
      let it handle its own trigger if it already does)
    - Manual install
    - ADB shell → opens `<AdbShellDialog>` for the connected device
    - Disconnect device (if connected)

Below header = content area `flex-1 overflow-auto px-8 py-6`:
- Loading state: HeroUI `Spinner` + status text.
- Error: `Card bg-danger/10` banner.
- Otherwise: either the **table** or the **card grid**.

**Card grid** (`prefs.viewMode === 'cards'`):
- CSS grid with arbitrary `[grid-template-columns:repeat(auto-fill,minmax(var(--card-min-w,200px),1fr))]`
  AND inline style for the `--card-min-w` based on `prefs.cardSize`. OR use
  Tailwind `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
  gap-4` for simplicity.
- Each card = `Card isPressable shadow="sm" onPress={() => setDialogGame(g)}`.
  - `CardBody class="p-0"` containing `Image src={`file://${g.thumbnailPath}`}`
    (with fallback to placeholder) `radius="none" className="aspect-square w-full object-cover"`.
  - Below: `p-3 flex flex-col gap-1` with name (`text-sm font-semibold
    line-clamp-2`), package/version line (`text-xs text-default-500`).
  - Top-right overlay: status `Chip size="sm" variant="flat"` (Installed →
    success, Update → warning).

**Table**:
- Keep the existing `@tanstack/react-table` + `@tanstack/react-virtual` setup.
  Don't rewrite the virtualization logic.
- Wrap rows in plain `<tr>` styled via Tailwind:
  `hover:bg-content2 cursor-pointer transition-colors`.
- Columns same as today: Status (icon + chip), Thumbnail, Name+Package,
  Version, Popularity, Size, Last Updated.
- Header: `<th class="text-xs font-semibold text-default-500 px-3 py-2
  border-b border-divider bg-content1 sticky top-0">`.
- Cell: `<td class="text-sm text-foreground px-3 py-2 border-b border-divider
  whitespace-nowrap truncate">`. Name cell shows package below in
  `text-xs text-default-500`.

**Empty state**: centered: lucide `LibraryBig` icon at 48 px, "No games match
your filters." in `text-base text-default-500`.

**GameDetailsDialog**: rebuild with HeroUI `Modal` / `ModalContent`
(`size="2xl"`). Header = game name. Body = grid: thumbnail on left
(`aspect-square w-48 rounded-medium overflow-hidden`), info on right
(version, package, size, popularity, last updated, blacklist status, install
status, OBB info). Footer = action `Button`s: Install / Reinstall / Update /
Uninstall / Download / Cancel / Delete from queue — same logic as current.

**State to preserve** (read from current file before deleting):
- `activeFilter: 'all'|'installed'|'update'`
- `categoryFilter: 'all'|'adult'|'non-adult'` (persists to `localStorage`
  `'vrcyberdeck:categoryFilter'`).
- `prefs` (viewMode, cardSize, cardSortKey, cardSortDir, rowDensity,
  alternatingRows, evenRowColor, oddRowColor, tableSortKey, tableSortDir) —
  read/write via the same `useGameDialog` / localStorage keys as today.

**Hooks**: same as the current GamesView. Read the file to capture the hook
list before deleting it.

---

### 4.5 Transfers page — `src/renderer/src/components/TransfersPage.tsx`,
`DownloadsView.tsx`, `UploadsView.tsx`, `ErrorDetailDialog.tsx`

**TransfersPage**: full-page container.
- Header (`px-8 py-6`): `<h1 class="text-2xl font-bold">Transfers</h1>` +
  `<p class="text-sm text-default-500 mt-1">Downloads and uploads queued on
  this device.</p>`.
- `Tabs variant="underlined" color="primary"`: Downloads / Uploads tabs.
  Uploads tab shows `<Chip size="sm" color="primary" variant="flat">{count}</Chip>`
  when > 0 active uploads.
- Tab state persisted to `localStorage` under `'vrcyberdeck:transfersTab'`.
- Body (`px-8 pb-8`): renders either `<DownloadsView onClose={()=>{}}/>` or
  `<UploadsView />`.

**DownloadsView** (`onClose: () => void` — accept but ignore):
- Top action bar: `flex gap-2 mb-4` →
  - `Button variant="flat" size="sm" startContent={<Folder/>}` "Scan downloads"
    (calls `window.api.downloads.scanForCompleted()`).
  - `Button variant="light" size="sm" startContent={<Trash2/>}` "Clear
    completed" (loops `removeFromQueueOnly` over completed/cancelled items).
- Row layout per item: `flex items-center gap-4 p-3 rounded-medium
  hover:bg-content2`:
  - `Image` 64×64 rounded.
  - Middle: name (`text-sm font-medium`) + release name
    (`text-xs text-default-500 font-mono` — only for the release name,
    elsewhere stays sans) + relative time
    (`text-xs text-default-400`).
  - Right (progress + status): when active, `Progress size="sm" color="primary"
    value={pct}` + percentage label; when finished, `Chip variant="flat"
    color={...}` with status label.
  - Far right: action buttons:
    - In-progress: `Button size="sm" variant="flat"` Pause/Resume; `Button
      isIconOnly size="sm" variant="light" aria-label="Cancel"` X (Cancel).
    - Completed + connected + sideloading enabled: `Button size="sm"
      color="primary" startContent={<ArrowDownToLine/>}` "Install"; `Button
      isIconOnly size="sm" variant="light"` Trash (delete).
    - Error: `Button size="sm" variant="flat" color="primary"` "Retry";
      `Button isIconOnly size="sm" variant="light" aria-label="View error"`
      `Info` (opens `ErrorDetailDialog`); `Button isIconOnly size="sm"
      variant="light"` Trash.
- Inline delete confirmation when `getDeleteOnRemove() === 'ask'`: replace
  the action column with a small `Card bg-warning/10 border-warning/30` row:
  "Delete files too?" + `Button size="sm" variant="light"` Keep files /
  `Button size="sm" color="danger" variant="flat"` Delete / `Button isIconOnly
  size="sm" variant="light"` X to cancel.
- Empty state: `LibraryBig` icon + "No active downloads." + helper line.

**UploadsView**: same row idiom as Downloads. Hooks `useUpload()`. Statuses:
Queued (default), Preparing (primary), Uploading (primary), Completed
(success), Cancelled (default), Error (danger). Action buttons: Cancel
(in-progress), Retry (error), Trash (any).

**ErrorDetailDialog**: HeroUI `Modal size="lg"`. Header = "Download error".
Body = pre-formatted error text in `bg-content2 rounded-medium p-3 text-xs
font-mono whitespace-pre-wrap`. Footer = `Button color="primary"` "Close".
Export `ErrorPhase` type. Don't touch the diagnosis-rules logic.

---

### 4.6 Settings page — `src/renderer/src/components/Settings.tsx`

**Default export `Settings`**, no props.

**Layout:**
- Outer container: `flex flex-col h-full overflow-auto bg-background`.
- Header (`px-8 py-6 max-w-[1280px] w-full mx-auto`): `<h1 class="text-2xl
  font-bold">Settings</h1>` + `<p class="text-sm text-default-500 mt-1">Configure
  preferences and manage your downloads. · v{appVersion}</p>`.
- Body (`px-8 pb-8 max-w-[1280px] w-full mx-auto`): a 2-column CSS grid
  (`grid grid-cols-1 lg:grid-cols-2 gap-4`).

**Section rendering** — each section is its own HeroUI `Card shadow="sm"
className="bg-content1"`. Inside each `Card`:
- `CardHeader` with `<h2 class="text-base font-semibold">Section title</h2>`.
- `Divider`.
- `CardBody class="p-5 flex flex-col gap-5"` containing the controls.

**No `Accordion`** — sections are always expanded. The grid handles vertical
flow.

**Section grid placement**:
- "Appearance" → `lg:col-span-2` (full width — densest).
- "Downloads & speed" → `lg:col-span-2` (also dense).
- "Multiplayer identity" → 1 col.
- "Log upload" → 1 col.
- "Game blacklist" → 1 col.
- "Content filter" → 1 col.

**Control rules:**
- Every toggle is a row: `<div class="flex items-start justify-between gap-4">`
  with left side = label (`text-sm font-medium text-foreground`) +
  description (`text-xs text-default-500 mt-0.5`); right side = HeroUI
  `Switch size="md" color="primary"`.
- Every choice that used to be a "1 2 3 4 5 6" or "ASK ME / INSTALL FROM
  EXISTING / RE-DOWNLOAD" pill row → use `Select` (not custom buttons).
- UI Zoom → `Slider` from 0.75 to 2.0 step 0.05, with `marks` at 0.75/1/1.25/
  1.5/2. Show "100%" beside the slider.
- Accent color → `Input type="color"` + a `Chip variant="flat"` showing the
  hex, and a `Button variant="light" size="sm"` to reset.
- Font picker → `Select` with FONT_FAMILY_OPTIONS choices. Below it, a small
  preview line "The quick brown fox" using `style={{ fontFamily: stack }}`.
- Sound effects → master `Switch`, `Slider` for volume (0-100), then for
  each `SOUND_NAMES` item a row with the name, a `Switch`, and an icon-only
  `Button` to play it (`window.api…play(name)` via the hook).
- Concurrent downloads → `Select` with options 1–6.
- "When download already exists" → `Select` with three options.
- Download path → `Input` with `endContent` `Button isIconOnly` Folder
  (calls `window.api.dialog.showDirectoryPicker()`), plus a `Button
  color="primary"` "Save" to commit.
- Speed limits → two `Input`s side-by-side, each with a `Select` for unit.
- Multiplayer username → `Input` + `Button color="primary"` Save. Disabled
  when not connected.
- Log upload → three flat `Button`s: "Open log folder", "Open log file",
  "Upload to rentry.co" (primary). When upload succeeds show a small
  `Card bg-success/10 border-success/30` with the slug + copy buttons.
- Game blacklist → list of rows in `Card` items, each with package name +
  version + `Button variant="light" color="danger" size="sm"` "Remove".
- Content filter → single Switch row "Hide adult content".

**Footer** at the bottom (still inside max-w container): a small card
`bg-content1` with `<span class="text-xs text-default-500">For the VR
community</span>` and `<span class="text-sm font-medium text-foreground">Made
with ♥ by DMP of Armgddn Games</span>` and a `Button isIconOnly variant="light"
size="sm" aria-label="Credits"` `HelpCircle` opening `<CreditsDialog
open={isCreditsOpen} onClose={...} variant="settings" />`.

**Hooks/IPC to preserve**: everything the current Settings.tsx imports —
`useSettings`, `useExtrasSettings` (`disableAutoUpdate, fontScale,
deleteOnRemove, disableSideloading, colorblindMode, accentColor, fontFamily`),
`useSoundEffects` (`enabled, volume, loaded, perName, setEnabled, setVolume,
setPerName, play, SOUND_NAMES`), `useLogs`, `useAdb` (`userName, setUserName,
loadingUserName, isConnected`), `useGames` (`getBlacklistGames,
removeGameFromBlacklist`), `useLanguage` (`t`), `window.api.settings.*`,
`window.api.dialog.showDirectoryPicker`, `localStorage.vrcyberdeck:hideAdult`.

---

## 5. Done means

- File compiles (`tsc --noEmit -p tsconfig.web.json` clean).
- No reference to `@fluentui/*`, `var(--vrcd-*)`, monospace as decoration,
  ALL-CAPS labels, or removed CSS files.
- Every text label visibly readable on its background (manual check OK).
- Every interactive control has a visible state at rest, hover, focus, active,
  and disabled.
- Component preserves the hook API and props listed in its section.
- Single commit per surface, message:
  `refactor(<surface>): rebuild in HeroUI per UI_SPEC`.
