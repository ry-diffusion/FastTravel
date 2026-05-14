# Fast Travel — UI SPEC (shadcn/ui, latest)

This document is the contract every redesign agent works against.
**Read it in full before writing any code.** Each per-surface section tells
you exactly what to build; every page must obey the shared rules in §1–§3.

You are also **required to invoke the `/frontend-design:frontend-design`
skill** at the start of your run. The skill produces the aesthetic discipline
you need; this SPEC produces the scope. Both inform your work.

---

## 1. Hard rules (every page)

### Stack — shadcn defaults only

- All UI primitives come from **shadcn/ui (new-york style, zinc base)**
  already installed under `src/renderer/src/components/ui/*`. Available:
  `button`, `card`, `dialog`, `input`, `label`, `select`, `slider`, `switch`,
  `tabs`, `tooltip`, `scroll-area`, `dropdown-menu`, `separator`, `sheet`,
  `badge`, `progress`, `popover`, `sonner`, `avatar`, `accordion`,
  `radio-group`, `table`, `skeleton`.
- Need a primitive that isn't installed? Add it with
  `npx shadcn@latest add <name>` from the project root.
- **Do not modify the files under `components/ui/`.** They are the shadcn
  primitives; treat them as vendor code.
- **No `@heroui/*` or `@fluentui/*` imports.** Both libraries are being phased
  out; HeroUI has been uninstalled. If you find a file still importing from
  either, replace those imports with shadcn equivalents.
- **No per-page CSS files** (`.css` in `assets/`). Style with Tailwind
  utility classes plus the shadcn variants. The only allowed CSS file is
  `assets/tailwind.css` (already set up — don't touch it) and the global
  resets in `assets/index.css` (also don't touch).

### Theme — shadcn default zinc dark theme

- The theme is the **default shadcn new-york zinc dark theme** with one
  override: `--primary` is set to a Quest-style blue (`217 91% 60%`). Do
  not over-customize. Do not introduce new CSS variables for colors.
- Use the semantic class names: `bg-background`, `bg-card`, `bg-popover`,
  `bg-muted`, `bg-secondary`, `bg-accent`, `bg-primary`, `text-foreground`,
  `text-muted-foreground`, `text-primary`, `border-border`, `border-input`,
  `ring-ring`. Status colors: `text-destructive`, `bg-destructive`.
- For "success" / "warning" semantics, shadcn does **not** ship dedicated
  variables — use Tailwind utilities: `text-emerald-500` /
  `text-amber-500` etc., or a `Badge` with `variant="secondary"` plus a
  green dot.

### Typography
- Sans-serif via the Inter system stack already wired in `tailwind.config.cjs`
  (`font-sans` is the default). Don't pick custom font families.
- Sentence case headings. No ALL CAPS labels. No `tracking-wider` on body.
- Heading scale:
  - Page title: `text-2xl font-semibold tracking-tight`
  - Section heading: `text-lg font-semibold`
  - Card title: `text-base font-semibold` (already done by shadcn `CardTitle`)
  - Body: `text-sm`
  - Caption: `text-xs text-muted-foreground`

### Icons — lucide-react only
- Already installed. Examples:
  - Devices: `Headphones`, `Smartphone`, `Glasses`
  - Library: `LibraryBig`
  - Transfers: `ArrowDownToLine`, `ArrowUpToLine`
  - Settings: `Settings`
  - Search: `Search`
  - More: `MoreHorizontal`
  - Close: `X`
  - Refresh: `RefreshCw`
  - Pause/Play: `Pause`, `Play`
  - Trash: `Trash2`
  - Folder: `Folder`
  - Theme: `Sun`, `Moon`
  - Help: `HelpCircle`, `Info`
  - Battery: `BatteryMedium`
  - Wi-Fi: `Wifi`
  - USB: `Usb`
- Size in nav / button: 16–20 px. Pass `size={N}` or wrap with `className="h-4 w-4"`.

### Behavior — preserve everything
- The redesign is renderer-only. Never edit `src/main/*`, `src/preload/*`,
  `src/shared/*`, `src/renderer/src/hooks/*`, `src/renderer/src/context/*`.
- Preserve every hook call, IPC call, localStorage key, and exported prop
  signature in the surface you own. Read the existing files (where they
  still exist) to capture behavior **before** deleting them.
- App entry / Tailwind / shadcn primitives are already configured — do not
  re-init them.

### Mandatory process for every owned file
1. `cd /home/zesmoi/src/FastTravel`.
2. **Invoke the `/frontend-design:frontend-design` skill** with your
   surface description. The skill output guides aesthetic decisions you
   make under the rules in this SPEC.
3. If a file already exists at the path, **delete it** (`rm path`) so you
   author from scratch — no inheriting old patterns.
4. Write the new file using shadcn primitives + Tailwind utilities only.
5. Verify `npx tsc --noEmit -p tsconfig.web.json` is clean. The
   pre-existing `gameService.ts` error in the node project is fine.
6. `git add` your files and `git commit -m "..."` in your worktree.

---

## 2. shadcn cheat sheet

| Need | shadcn primitive |
|---|---|
| Page-level container with subtle elevation | `Card` + `CardHeader` + `CardContent` |
| Primary action | `Button` (default variant). |
| Secondary | `Button variant="secondary"`. |
| Subtle / icon-only | `Button variant="ghost" size="icon"`. |
| Outlined | `Button variant="outline"`. |
| Destructive | `Button variant="destructive"`. |
| Toggle | `Switch` (has visible track + thumb out of the box). |
| Choice from a list | `Select` + `SelectTrigger` + `SelectContent` + `SelectItem`. |
| Radio group | `RadioGroup` + `RadioGroupItem`. |
| Slider | `Slider`. |
| Tabs | `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent`. |
| Status pill | `Badge` with `variant="secondary"`/`"destructive"`/`"outline"`. |
| Modal | `Dialog` + `DialogContent` + `DialogHeader` + `DialogTitle` + `DialogDescription` + `DialogFooter`. |
| Side panel (right) | `Sheet` + `SheetContent` (`side="right"`). |
| Drawer (bottom) | `Drawer` (via vaul — not added yet, run `add drawer` if needed). |
| Popover | `Popover` + `PopoverTrigger` + `PopoverContent`. |
| Dropdown / context menu | `DropdownMenu` + `DropdownMenuTrigger` + `DropdownMenuContent` + `DropdownMenuItem`. |
| Tooltip | `Tooltip` + `TooltipTrigger` + `TooltipContent`. Wrap the page in `<TooltipProvider>` at the chrome level. |
| Avatar / image fallback | `Avatar` + `AvatarImage` + `AvatarFallback`. |
| Table | shadcn `Table` (and `@tanstack/react-table` is still installed for virtualization). |
| Progress | `Progress` with `value`. |
| Loading | `Skeleton` for content placeholders. For spinning loaders, use a simple lucide `Loader2` with `animate-spin`. |
| Toast | `sonner` `<Toaster />` is mounted in `main.tsx`. Call `toast("...")` from anywhere. |

Always pass `aria-label` on icon-only buttons and unlabeled controls.

---

## 3. Per-surface specs

> **Note for every surface:** the legacy `Settings.tsx`, `GamesView.tsx`,
> `DeviceList.tsx`, `Sidebar.tsx`, `AppLayout.tsx`, etc. have already been
> **deleted** by the SPEC author. The current `App.tsx` is a stub. You'll
> create the files from scratch. Read sibling files (hooks, contexts, types)
> to understand what data your page consumes, but you have no old JSX to
> work from.

### 3.1 Layout (chrome) — owned by the "layout" agent

Files to author:
- `src/renderer/src/components/AppLayout.tsx` — the root app shell
- `src/renderer/src/components/Sidebar.tsx`
- `src/renderer/src/components/TransferStrip.tsx`
- `src/renderer/src/components/QuestLoader.tsx`
- Replace `src/renderer/src/App.tsx` so it renders `AppLayout` instead of
  the rebuilding-spinner stub.

**AppView enum** — export from `AppLayout`:
```ts
export enum AppView { DEVICE_LIST, GAMES, TRANSFERS, SETTINGS }
```

**Provider chain** (read the OLD AppLayout via `git show HEAD~5:src/renderer/src/components/AppLayout.tsx` to confirm — DO NOT preserve any visuals from it, only the provider order):
```
ErrorBoundary
  SettingsProvider
    LanguageProvider
      DependencyProvider
        DownloadProvider
          UploadProvider
            AdbProvider
              GamesProvider
                GameDialogProvider
                  <TooltipProvider>     ← add this (shadcn)
                    <App layout JSX>
```

`FluentProvider` is **no longer needed** — we are fully on shadcn. If any
existing dialog (`AdbShellDialog`, `UploadGamesDialog`, `LocalUploadDialog`,
`MirrorManagement`, `CreditsDialog`, `UpdateNotification`, `ServerConfigSettings`)
imports from `@fluentui/react-components`, leave those alone — they'll be
migrated in a later pass — but do not mount a `FluentProvider`. Wrap any
Fluent-using dialog with a tiny inline `FluentProvider` itself if necessary,
but try first without it.

**Layout structure:**
- Root: `<div class="flex h-screen w-screen overflow-hidden bg-background text-foreground">`.
- Left: `<Sidebar ... />` width ~16rem.
- Right: `<main class="flex-1 min-w-0 flex flex-col overflow-hidden">`:
  - Optional `<TransferStrip />` at top (returns null when no transfers).
  - `<MainContent currentView=... />` filling the rest.
- `MainContent` switches on `currentView`:
  - `DEVICE_LIST` → `<DeviceList ... />`
  - `GAMES` → `<GamesView ... />`
  - `TRANSFERS` → `<TransfersPage />`
  - `SETTINGS` → `<Settings />`
  - When `!dependenciesReady`: render a centered `<QuestLoader title ... />`
    or the connectivity-error card (use shadcn `Card`).
- Close-confirm modal: shadcn `Dialog` triggered by the existing IPC.
- Render `<UpdateNotification />`, `<CreditsDialog />`, `<UploadGamesDialog />`
  near the bottom of the tree.

**Sidebar** — width `w-64`, full-height, `bg-card border-r border-border`,
flex column:
1. Brand block (`px-4 py-5`): `Avatar` (image `'../assets/icon.svg'`) +
   stacked "Fast Travel" / "Sideload manager".
2. Primary nav (Devices, Library): each item is a `Button variant="ghost"`
   with full width, `justify-start`, lucide icon + label. Active item uses
   `variant="secondary"` to highlight.
3. `Separator` with `my-2`.
4. Secondary nav (Transfers — with `Badge` count if `activeTransfers > 0`,
   Settings).
5. Footer pinned to bottom (`mt-auto border-t border-border pt-3 px-3`):
   - Three status rows in a `<dl>`:
     - Server: "Online" (`text-emerald-500`) or "Offline" (`text-amber-500`).
     - Device: model name (`text-emerald-500` if connected, `text-muted-foreground` else).
     - Library: "N games".
   - Theme toggle: a `Switch` with `Moon`/`Sun` adjacent (visible track).
   - Version line: `<span class="text-xs text-muted-foreground">v{appVersion}
     · Made with ♥ by DMP</span>` + `Button variant="ghost" size="icon"`
     with `HelpCircle` opening credits.

**Sidebar props:**
```ts
type SidebarView = 'devices' | 'library' | 'transfers' | 'settings'
interface SidebarProps {
  currentView: SidebarView
  onSelectView: (v: SidebarView) => void
  onOpenCredits: () => void
  appVersion: string
}
```

Hooks: `useAdb` (`isConnected, selectedDeviceDetails`),
`useGames` (`games`), `useSettings` (`serverConfig, colorScheme, setColorScheme`),
`useDownload` (`queue`), `useUpload` (`queue`).

**TransferStrip** — collapses to `null` when no active transfers. Otherwise:
- A compact strip `px-4 py-2 border-b border-border bg-card flex items-center gap-3`.
- `Badge variant="secondary"` with `ArrowDownToLine`/`ArrowUpToLine`.
- Game name (truncated).
- Stage (`text-xs text-muted-foreground`).
- shadcn `Progress` (`h-1`).
- Percentage.
- Rotates through entries every 4s.

**QuestLoader** props: `{ title: string; subtitle?: string; progress?: number | null }`.
Centered. Big bold title, muted subtitle, shadcn `Progress` (indeterminate
when `progress == null`).

---

### 3.2 Devices page — owned by the "devices" agent

File: `src/renderer/src/components/DeviceList.tsx`.

**Props:** `{ onSkip?: () => void; onConnected?: () => void }`.

**Layout:**
- Outer: `<div class="flex h-full w-full items-center justify-center p-8 overflow-auto">`.
- Inner: shadcn `Card class="w-full max-w-2xl"`:
  - `CardHeader`: `CardTitle` "Devices" + small `Loader2` spinner when scanning. Right side: `Button size="sm" variant="outline"` Scan (`RefreshCw` icon, loading state), `Button size="sm" variant="secondary"` "Continue offline" or `Button size="sm"` "Continue".
  - `CardContent`:
    - Error banner (when `error`): a `Card class="bg-destructive/10 border-destructive/30"` with destructive text.
    - "Add by IP" subsection: `Label` "Add by IP", then a row of `Input placeholder="192.168.x.x"`, `Input class="w-24" placeholder="Port"` (default 5555), `Button` "Add".
    - Device list: each is a `Card class="bg-muted/30"`:
      - Left: `Avatar` (or shaded square) with `Headphones` / `Wifi` icon.
      - Middle: model name (sentence case, `text-sm font-medium`), meta row in `text-xs text-muted-foreground` with parts separated by `·`: USB/Wi-Fi/IP/Battery/Free storage/Ping latency in "12 ms · good".
      - Status `Badge` colored by state — connected (`bg-emerald-500/15 text-emerald-500 border-emerald-500/30`), connecting (`bg-primary/15 text-primary border-primary/30`), error (`bg-destructive/15 text-destructive border-destructive/30`), saved (`variant="outline"`), offline (`variant="secondary"`).
      - Right: action buttons (Shell + Disconnect when connected; Connect [+ Save / Remove bookmark] otherwise).
  - Empty: centered icon + "No devices found" + "Connect a headset over USB or add one by IP above.".
  - Connected footer: dot + "Connected" (`text-emerald-500`).
- Render `<AdbShellDialog deviceId=... isOpen onDismiss />` at the end — controlled by `shellDialogDeviceId` state.

**Hooks/types**: see SPEC §3.2 of the previous spec — unchanged. The hook
signatures and IPC calls are the same. Read `git show HEAD~7:src/renderer/src/components/DeviceList.tsx` for behavior.

---

### 3.3 Library page — owned by the "library" agent

Files: `GamesView.tsx`, `GameDetailsDialog.tsx`.

**Default export `GamesView`** with props `{ onBackToDevices, onTransfers, onSettings }`.

**Header bar (sticky inside the page):**
- Row 1: page title "Library" + game count + last sync time. Right edge:
  a "ConnectedDeviceChip" component — shadcn `Badge` with model + battery%
  that opens a `Popover` with Disconnect / Refresh packages / ADB shell.
- Row 2: toolbar — search `Input` (with `Search` icon), filter `Tabs`
  (All/Installed/Updates with count badges), `Select` category (All/Safe/Adult),
  view-mode toggle icon `Button`, display-options `Popover` (sort, density,
  alternating rows), `DropdownMenu` "More" (Refresh games, Manage mirrors,
  Upload local files, Manual install, ADB shell, Disconnect device).

**Body:** virtualized TanStack table OR grid of `Card`s. Keep TanStack +
TanStack-virtual for the table.

**Card grid:**
- CSS grid `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`
  with `gap-4`.
- Each card = shadcn `Card class="overflow-hidden cursor-pointer hover:bg-accent transition-colors"`. Inside:
  - Square thumbnail at the top (use `<img>` with `class="aspect-square w-full object-cover"`).
  - `CardContent class="p-3 space-y-1"`: name (`text-sm font-semibold line-clamp-2`), package/version (`text-xs text-muted-foreground`).
  - Top-right overlay `Badge` for Installed (`bg-emerald-500`) / Update (`bg-amber-500`).

**Table:**
- Use shadcn `Table` + the TanStack rendering you already have. Style header
  rows as `bg-card text-muted-foreground sticky top-0`. Cell hover via
  `hover:bg-accent`.

**GameDetailsDialog** — shadcn `Dialog` with `DialogContent class="max-w-2xl"`.
- `DialogHeader` `DialogTitle` = game name.
- Body grid: thumbnail (`w-48 aspect-square rounded-lg`) on left, info column
  on right (version, package, size, popularity, last updated, install/blacklist
  status, OBB info).
- `DialogFooter` action `Button`s (Install / Reinstall / Update / Uninstall /
  Download / Cancel / Delete from queue).

**Hooks:** `useGames, useAdb, useDownload, useUpload, useLanguage,
useGameDialog, useExtrasSettings, useSettings`. Read `git show HEAD~7:src/renderer/src/components/GamesView.tsx` for the handler implementations.

---

### 3.4 Transfers page — owned by the "transfers" agent

Files: `TransfersPage.tsx`, `DownloadsView.tsx`, `UploadsView.tsx`, `ErrorDetailDialog.tsx`.

**TransfersPage:**
- Page header "Transfers" + subtitle.
- shadcn `Tabs` (Downloads / Uploads) — Uploads tab shows a `Badge` count.
- Tab state persisted to `localStorage` `'vrcyberdeck:transfersTab'`.

**DownloadsView** — props `{ onClose: () => void }` (accept but ignore).
- Top action row: `Button variant="outline" size="sm"` "Scan downloads"
  (calls `window.api.downloads.scanDownloadFolder()`); `Button variant="ghost"
  size="sm"` "Clear completed".
- Each item row: thumbnail (64×64 rounded), name + release + relative time,
  progress `Progress` + status `Badge`, action `Button`s (Pause/Resume,
  Cancel, Install, Retry, View error, Delete).
- Inline delete confirmation when `getDeleteOnRemove() === 'ask'` — a small
  `Card bg-amber-500/10 border-amber-500/30` row with Keep files / Delete /
  Cancel.
- Empty state: icon + "No active downloads." + helper.

**UploadsView** — analogous to DownloadsView with upload statuses.

**ErrorDetailDialog** — shadcn `Dialog size="lg"`. Header = "Download error".
Body has the diagnosis rules text in `<pre class="bg-muted rounded-md p-3 text-xs font-mono whitespace-pre-wrap">`. Footer = `Button` "Close".

---

### 3.5 Settings page — owned by the "settings" agent

File: `Settings.tsx`. **No props.**

**Layout** — full page:
- Header: `text-2xl font-semibold tracking-tight` "Settings" + muted
  subtitle "Configure preferences and manage your downloads. · v{appVersion}".
- Body: 2-column CSS grid (`grid grid-cols-1 lg:grid-cols-2 gap-4`).
- Each section is a **shadcn `Card`** (always expanded, NOT an Accordion):
  - `CardHeader` with `CardTitle`.
  - `CardContent class="space-y-5"`.
- Dense sections span both columns (`lg:col-span-2`):
  - **Appearance** (was "Appearance & extras"): disable auto-update,
    disable sideloading, colorblind mode, accent color (`<input type="color">`
    + `Badge` showing hex + Reset `Button`), font family (`Select` + preview),
    sound effects (master `Switch` + `Slider` volume + per-`SOUND_NAMES`
    rows with `Switch` and a play `Button variant="ghost" size="icon"`),
    UI zoom (`Slider` 0.75–2.0 step 0.05, marks at 0.75/1/1.25/1.5/2 — but
    keep the marks UNDER the slider, not overlapping the description),
    delete-on-remove (`Select`), concurrent downloads (`Select` 1–6),
    limit-extraction-threads (`Switch`), existing-download-action (`Select`).
  - **Downloads & speed**: download path `Input` with `endContent` folder
    `Button` + Save; speed limits two `Input` + unit `Select`s; server config.
- Single-column sections:
  - **Multiplayer identity**: `Input` + Save `Button`.
  - **Log upload**: three `Button`s (Open folder / Open file / Upload).
  - **Game blacklist**: list of rows with `Button variant="ghost" size="sm"` Remove.
  - **Content filter**: single `Switch` "Hide adult content".

**Control rules** (HARD):
- Every toggle is a row: label + description on the left, `Switch` on the right. Use a tiny `<div class="flex items-start justify-between gap-4">`.
- Every discrete choice → `Select` (never custom button groups).
- Sliders: `Slider` with `step`/`min`/`max`. For "marks", show a separate
  `<div class="flex justify-between text-xs text-muted-foreground mt-1">`
  row BELOW the slider — don't use `Slider` marks if shadcn doesn't have them
  natively (it doesn't ship marks, so just render labels manually).
- Footer card: `<span class="text-xs text-muted-foreground">For the VR community</span>` + "Made with ♥ by DMP of Armgddn Games" + a help icon button opening Credits.

**Hooks/IPC to preserve**: same as the previous SPEC — `useSettings`,
`useExtrasSettings`, `useSoundEffects` (`SOUND_NAMES`), `useLogs`, `useAdb`
(`userName, setUserName, loadingUserName, isConnected`), `useGames`
(`getBlacklistGames, removeGameFromBlacklist`), `useLanguage`, plus all
`window.api.*` calls and the localStorage key `'vrcyberdeck:hideAdult'`.

---

## 4. Done means

- File type-checks (`tsc --noEmit -p tsconfig.web.json` clean).
- No `@fluentui/*` / `@heroui/*` imports in your owned files. No
  custom CSS files. No `var(--vrcd-*)` / `var(--quest-*)`.
- Every text reads on its background (shadcn's default tokens are
  WCAG-AA on the dark theme).
- Every interactive control has visible rest, hover, focus, active, and
  disabled states (shadcn handles this — don't override).
- Single commit per surface, message:
  `refactor(<surface>): rebuild in shadcn per UI_SPEC`.
