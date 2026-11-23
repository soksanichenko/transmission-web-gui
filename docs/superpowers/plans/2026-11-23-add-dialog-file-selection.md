# Add Dialog File Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user untick files of a `.torrent` in the Add Torrent dialog so they are sent to Transmission as `files-unwanted`.

**Architecture:** A small bencode reader extracts the file list from the chosen `.torrent` in the browser. `AddDialog` renders checkboxes and passes the unticked indices up through `onAdd` → `MainWindow.handleAdd` → `rpc.addTorrentFile`, which adds `files-unwanted` to `torrent-add`.

**Tech Stack:** React 19, TypeScript, Vite. No test runner exists in this project (do not add one); the parser is verified with a throwaway esbuild script in the scratchpad.

**Spec:** `docs/superpowers/specs/2026-11-23-add-dialog-file-selection-design.md`

## Global Constraints

- Inline `style={{...}}` + `var(--token)` only; no `className`, no new npm packages, no `console.log`.
- Single quotes, no semicolons (match the existing TS files).
- File indices must follow the order of `info.files` in the `.torrent`.
- Magnet flow stays unchanged.

## Review Focus

- Single-file torrent (no `info.files`): no list shown, torrent added as before.
- Unparseable / non-bencode file: no list, add still works with the old behaviour.
- All files unticked: "Add" disabled.
- Choosing a second `.torrent` after the first: selection resets to all ticked.
- `path.utf-8` present vs. only `path`: names decoded as UTF-8 either way (non-ASCII names).

---

### Task 1: Torrent file-list parser

**Files:**
- Create: `frontend/src/utils/torrentFiles.ts`

**Interfaces:**
- Produces: `export interface TorrentFileEntry { path: string; length: number }` and `export function parseTorrentFiles(bytes: Uint8Array): TorrentFileEntry[] | null` — returns `null` when the data is not a valid torrent; a single-file torrent returns one entry `{ path: info.name, length: info.length }`; a multi-file torrent returns one entry per `info.files[i]` in order, `path` = `path.utf-8` if present else `path`, segments joined with `/`.

- [ ] **Step 1: Implement `parseTorrentFiles` in `frontend/src/utils/torrentFiles.ts`.** Write a private recursive bencode decoder over `Uint8Array` (ints `i…e`, byte strings `<len>:…` kept as `Uint8Array`, lists `l…e`, dicts `d…e` as `Map<string, unknown>` keyed by decoded ASCII key). Decode string values with `new TextDecoder('utf-8')` only where a name/path is read, never for `pieces`. Wrap in try/catch returning `null` on any error or when `info` is missing.
- [ ] **Step 2: Verify with a throwaway script (scratchpad, not in the repo).** Bundle with `npx esbuild` and run with node against: (a) a hand-built bencoded multi-file torrent with 3 files including one with `path.utf-8` non-ASCII name → expect 3 entries in order with correct lengths and names; (b) a single-file torrent → expect 1 entry; (c) `new Uint8Array([1,2,3])` → expect `null`. Expected: all three assertions pass.
- [ ] **Step 3: Type-check.** Run `npx tsc --noEmit -p .` in `frontend/`. Expected: no output.

### Task 2: Wire the file list through the dialog and RPC

**Files:**
- Modify: `frontend/src/api/rpc.ts:220-226` (`addTorrentFile`)
- Modify: `frontend/src/ui/MainWindow.tsx:382-390` (`handleAdd`)
- Modify: `frontend/src/ui/AddDialog.tsx`

**Interfaces:**
- Consumes: `parseTorrentFiles`, `TorrentFileEntry` from Task 1.
- Produces: `addTorrentFile(metainfo: string, downloadDir: string, paused: boolean, unwantedFiles?: number[]): Promise<void>` (adds `'files-unwanted': unwantedFiles` only when non-empty); `onAdd` params gain `unwantedFiles?: number[]`.

- [ ] **Step 1: `rpc.addTorrentFile`** gets the optional fourth parameter and spreads `{ 'files-unwanted': unwantedFiles }` into the `torrent-add` arguments only when `unwantedFiles?.length` is truthy.
- [ ] **Step 2: `MainWindow.handleAdd`** extends its param type with `unwantedFiles?: number[]` and passes it as the fourth argument in the `isFile` branch.
- [ ] **Step 3: `AddDialog` state.** In `readFile`, additionally call `f.arrayBuffer()` and set `files` state to `parseTorrentFiles(new Uint8Array(buf))` and `unticked` state (`Set<number>`) to empty; clear both when a new file is read. `handleAdd` passes `unwantedFiles: [...unticked]` for file adds.
- [ ] **Step 4: `AddDialog` UI.** When `files` has 2+ entries, render under the drop zone: a header row with "Select all" / "None" text buttons and the summary "N of M selected · <size>" (use `size()` from `../utils/format`), then a scrollable list (`maxHeight: 180`, `overflow: 'auto'`) of `Checkbox` rows showing the path (ellipsis) and right-aligned size (`var(--font-mono)`). Disable "Add" when a file is chosen and every entry is unticked. Dialog `width` stays 440.
- [ ] **Step 5: Verify.** Run `npm run build --prefix frontend`. Expected: build succeeds. Then run `npm run dev --prefix frontend`, open the Add Torrent dialog, choose a multi-file `.torrent`, untick some files, add it, and confirm in Details → Files that the unticked files show as skipped (dimmed). Also confirm a single-file torrent and a magnet link still add normally.
