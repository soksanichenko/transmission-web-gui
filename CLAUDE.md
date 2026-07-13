# CLAUDE.md — transmission-web-gui

## What this project is

A custom web UI for the Transmission BitTorrent daemon. Dense, information-rich interface in the spirit of µTorrent 2.x. React 18 + TypeScript + Vite frontend, FastAPI config backend, deployed via Ansible to `homeserver.zelgray.work`.

## How to run

```bash
npm run dev --prefix frontend    # Vite dev server at http://localhost:5173/transmission-ui/
npm run build --prefix frontend  # tsc + vite build → frontend/dist/
```

For the config-api backend locally:
```bash
CONFIG_PATH=./frontend/public/config.json uvicorn backend.main:app --reload --port 8095
```

Transmission must be reachable at `localhost:9091`, or the RPC URL can be changed in Preferences → Connection.

## Architecture decisions

### No CSS Modules, no UI library
All styling is done with inline styles and CSS custom properties (`var(--token)`). CSS variables are defined in `src/styles/`. Do not introduce styled-components, Tailwind, or any component library.

### Inline styles only — no className
Every component uses `style={{...}}` objects. Do not add `className` props or create CSS class rules except in `src/styles/` for global resets and variables.

### Icons are embedded SVG paths
`src/components/controls/Icon.tsx` holds Lucide icon paths as a hardcoded map and renders them with `dangerouslySetInnerHTML`. Do not add an icon CDN or npm icon package.

### `useResizableCols` — shared resize/auto-fit hook
`src/utils/useResizableCols.ts` handles drag-to-resize and double-click auto-fit for any grid table. It persists widths to `localStorage` per `storageKey`. When adding a new table, use this hook — don't roll a separate resize implementation.

The hook requires data cells to have `data-col={columnIndex}` so auto-fit can measure content via `scrollWidth` of `firstElementChild`.

### Transmission RPC client
`src/api/rpc.ts` handles:
- `X-Transmission-Session-Id` header, automatic 409 retry
- HTTP Basic Auth via `Authorization: Basic btoa(user:pass)`
- Config is read per-call from `getConnectionConfig()` — never cached at module level

### Connection config layering
`src/api/config.ts` merges three sources (lowest → highest priority):
1. Hardcoded defaults
2. Server config fetched from `/transmission-ui/api/config` at startup (`loadServerConfig()`, called in `main.tsx` before React render)
3. localStorage overrides written by the Preferences dialog

`saveServerConfig()` POSTs to the FastAPI backend to persist changes across browsers.

### Polling
`MainWindow.tsx` polls every 3 s via `setInterval`. Polling pauses when the tab is hidden (Page Visibility API). After any mutating action (add, remove, start, stop) the app calls `refresh()` immediately without waiting for the next tick.

### Details refresh vs torrent list refresh
`refreshDetails()` increments a `detailsKey` state, causing the details `useEffect` to re-fetch without changing `selected`. Use this after file-level actions (wanted toggle, file priority) rather than triggering a full torrent list poll.

### Tracker filtering
`Torrent.trackers` (fetched via `TORRENT_FIELDS`) provides tracker URLs for every torrent in the list. `Sidebar.tsx` groups them by hostname (extracted via `new URL(announce).hostname`). `MainWindow.tsx` filters with the `tracker:<hostname>` prefix in the `filter` state string.

### Filter state patterns
The `filter` string in `MainWindow` follows these conventions:
- `'all'` — no filter
- `'active'` — torrents with `rateDownload > 0 || rateUpload > 0`
- `'<TorrentStatus>'` — exact status match (`'downloading'`, `'seeding'`, `'paused'`, `'checking'`, `'error'`)
- `'dir:<path>'` — download directory match
- `'tracker:<hostname>'` — tracker hostname match
- `'label:<name>'` — torrent has this label
- `'no-label'` — torrent has no labels (`labels.length === 0`)

### Labels
Transmission RPC v3.0+ exposes `labels: string[]` on each torrent. They are fetched as part of `TORRENT_FIELDS` and stored on the `Torrent` interface. `rpc.setTorrentLabels(id, labels)` maps to `torrent-set`. The sidebar Labels section shows labels from live torrents plus any presets from `localStorage['transmission-label-presets']`. The context menu Labels submenu uses `check` (all selected have it), `minus` (some have it), or no icon.

### Folder presets
`localStorage['transmission-dir-presets']` stores a user-defined list of download folder paths, managed in `SettingsDialog` (Folders group) with the same add/remove pattern as label presets. `MainWindow.tsx`'s `dirs` list (passed to `AddDialog`) merges these presets with every `downloadDir` currently in use by live torrents. `AddDialog`'s folder field is a free-text `Input` (with a `<datalist>` for browser autocomplete) plus a chevron button that opens a `ContextMenu` populated from `dirs` — clicking an entry fills the input, but any path can still be typed manually.

### Date display format
`frontend/src/utils/format.ts` reads the date format from `localStorage['transmission-date-format']` on every call to `date()` (per-call, not cached — same convention as connection config). `getDateFormat()`/`setDateFormat()` and the `DATE_FORMAT_OPTIONS` list (used to populate the `Select` in `SettingsDialog`'s Display group) live alongside `date()`. Supported values: `'locale'` (default, e.g. "Jul 2, 2026"), `'iso'` ("2026-07-02"), `'eu'` ("02.07.2026"), `'us'` ("07/02/2026") — all followed by a locale-formatted `HH:mm` time.

### Checking / recheck progress
Transmission reports verification progress via `recheckProgress` (0–1), separate from `percentDone` which stays at its pre-check value until verification finishes. `TORRENT_FIELDS` fetches `recheckProgress`; `TorrentTable`'s Progress column renders `recheckProgress` instead of `percentDone` whenever `status === 'checking'`. Because polling only refetches `TorrentDetails` (used by the Files tab's per-file bars) on selection change or `refreshDetails()`, `MainWindow` also bumps `detailsKey` on every poll tick while the selected torrent's status is `'checking'`, so per-file progress stays live too.

### Magnet metadata progress
Transmission reports `metadataPercentComplete` (0–1) for torrents added via magnet link that haven't yet fetched the .torrent metadata from peers — during this phase `percentDone` stays at 0 since `totalSize` is unknown. `TorrentTable`'s Progress column renders `metadataPercentComplete` (striped, like the checking state) instead of `percentDone` whenever it is below 1, and the Status column shows "Getting metadata" in place of the normal status label.

### Auth error handling
`rpc.ts` exports `AuthRequiredError`. All fetches use `credentials: 'omit'` to suppress the browser's native Basic Auth dialog. A 401 response throws `AuthRequiredError`. `MainWindow` catches it in `refresh()` and sets `authRequired` state, but keeps polling every 3 s like any other failed tick — this lets the app self-heal automatically once the RPC endpoint is reachable again (e.g. after a redeploy), without requiring the user to open Settings. A banner renders with an "Open Settings" button while `authRequired` is true.

### Sidebar context menu for bulk ops
Right-clicking any sidebar filter item calls `onSidebarContext(filterKey, x, y)` in `MainWindow`, which opens a `ContextMenu` with bulk actions (Start All, Stop All, Re-announce, Recheck, Labels submenu, Remove All, Remove With Data) scoped to torrents matching that filter key. `getSidebarTorrentIds(filterKey)` mirrors the same filter logic used for the torrent list view.

### Settings unsaved-changes warning
`SettingsDialog` captures baseline `conn`, `s`, `labelPresets`, `dirPresets`, and `dateFormat` in `useRef` at mount time. `isDirty` compares current state to baseline via `JSON.stringify` (`dateFormat` by direct `!==` since it's a primitive). Closing via Cancel/Escape/X when dirty shows a confirmation `Dialog` with Keep Editing / Discard / Save & Close options.

### Keyboard shortcuts
Global `keydown` listener in `MainWindow` (ignored while focus is on an `input`/`textarea`/`select` or inside an open dialog): Up/Down navigate the current view's selection, `Insert` opens Add Torrent, `Delete`/`Shift+Delete` open the Remove / Remove With Data confirm dialogs for the current selection, `F2` opens Rename, and `Alt+Enter` opens Properties (the latter two require exactly one selected torrent). The per-torrent `ContextMenu` shows these as `shortcut` hints on the matching `MenuItem`s (`ContextMenu`/`MenuItemButton` already render `item.shortcut` if present).

### Context menu submenu pattern
`ContextMenu` supports `submenu?: MenuItem[]` on any item. Clicking a submenu parent toggles inline expansion (accordion); submenu items render indented below the parent. Do not add hover-triggered flyout submenus.

### Per-torrent properties
`TorrentPropertiesDialog` fetches its own data on mount via `rpc.getTorrentProps()` (separate `torrent-get` call with only the needed fields). It does not rely on the `details` state in `MainWindow`. Save calls `rpc.saveTorrentProps()` which maps to `torrent-set`.

### Backend linting
`backend/` is linted by ruff via `.pre-commit-config.yaml` (ruff check + ruff-format). `pyproject.toml` pins `quote-style = "single"` under `[tool.ruff.format]` — ruff's default is double quotes, which conflicts with this project's single-quote convention for Python.

## Key files

| File | Purpose |
|---|---|
| `frontend/src/main.tsx` | Entry point — awaits `loadServerConfig()` before mounting React |
| `frontend/src/api/config.ts` | Connection config: server fetch, localStorage, defaults |
| `frontend/src/api/rpc.ts` | All Transmission JSON-RPC calls |
| `frontend/src/api/types.ts` | `Torrent`, `TorrentDetails`, `SessionInfo`, `SessionStats`, `TorrentTracker` — add new fields here + to `TORRENT_FIELDS` / `DETAILS_FIELDS` |
| `frontend/src/ui/MainWindow.tsx` | Root component: polling, selection, sort, filter, all dialogs |
| `frontend/src/ui/TorrentTable.tsx` | 13-column grid; column defs (`COLS`) control label, width, sort key, render; double-click row → Properties |
| `frontend/src/ui/Sidebar.tsx` | Resizable sidebar with collapsible Status / Folders / Trackers / Labels sections; right-click items fire `onSidebarContext`; section collapse persisted in `localStorage['transmission-sidebar-sections']` |
| `frontend/src/ui/DetailsPanel.tsx` | Bottom panel; tabs: Info, Files, Peers, Trackers, Graph; `ResizableHeadRow` is a function-as-hook |
| `frontend/src/ui/TorrentPropertiesDialog.tsx` | Per-torrent Properties dialog: General (speed/peer/seeding limits) + Trackers tab |
| `frontend/src/utils/useResizableCols.ts` | Resizable + auto-fit columns; returns `{ widths, template, startResize, autoFit }` |
| `frontend/src/utils/format.ts` | `size()`, `rate()`, `eta()`, `date()`, `duration()` — all formatting lives here |
| `backend/main.py` | FastAPI: `GET /config`, `POST /config`; reads/writes `CONFIG_PATH` env |

## Adding a new torrent column

1. Add the field name to `TORRENT_FIELDS` in `frontend/src/api/types.ts`
2. Add the field to the `Torrent` interface
3. Add a `ColDef` entry to `COLS` in `frontend/src/ui/TorrentTable.tsx` with `key`, `label`, `defaultW`, `minW`, `align`, and update the `cell()` switch
4. `useResizableCols` picks up the new column automatically via `COLS.map(c => c.defaultW)`

## Styling tokens

All design tokens are CSS custom properties. Key groups:

- `--text`, `--text-secondary`, `--text-muted` — text hierarchy
- `--surface`, `--surface-alt`, `--chrome-bg` — background layers
- `--accent-500` — primary accent (blue)
- `--status-download`, `--status-seed`, `--status-pause`, `--status-error` — torrent status colours
- `--font-sans`, `--font-mono` — IBM Plex Sans / Mono
- `--fs-2xs` through `--fs-base` — font size scale
- `--border`, `--border-faint` — border colours
- `--row-h`, `--header-h` — row and header heights

## Ansible deployment

```bash
cd ansible
ansible-playbook -i inventories/home-server playbooks/deploy.yml
```

Required env vars: `INFISICAL_API_URL`, `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`.

The playbook builds the frontend locally, rsyncs `dist/` to the nginx html directory on the target host, builds and deploys the config-api Docker container, and drops nginx location/upstream configs.

The initial `config.json` is templated from Infisical secrets (`transmission-rpc-username`, `transmission-rpc-password`) with `force: no` — it is not overwritten on subsequent deploys.

## What NOT to do

- Do not add `console.log` — silence errors silently or let them surface to the user via the UI
- Do not add a CSS framework, component library, or CDN icon package
- Do not add an icon CDN or npm icon package — extend `Icon.tsx`'s `PATHS` map with Lucide SVG path strings
- Do not add error boundaries or loading skeletons beyond what already exists
- Do not cache the RPC session ID or connection config at module load time — both are read per-call
- Do not use `React.memo` or `useMemo` speculatively — the torrent list is small enough that it isn't needed
- Do not commit `public/config.json` — it is gitignored because it contains RPC credentials
- Do not implement hover-triggered flyout submenus in `ContextMenu` — use click-to-expand inline submenus
