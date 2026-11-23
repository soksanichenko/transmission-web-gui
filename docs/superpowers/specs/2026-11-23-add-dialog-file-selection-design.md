# Add dialog: choose files to download — design

Status: approved by the user (2026-11-23). Size: small change.

## Intent
When adding a `.torrent` file, let the user untick files they don't want before the
torrent is added, so unwanted files never start downloading. Today the file
selection is only possible afterwards, in the Files tab of an existing torrent.

## Goals
- After a `.torrent` file is chosen in `AddDialog`, show its file list with checkboxes,
  sizes, and a "selected N of M (size)" summary, plus "Select all" / "None".
- Send the unticked file indices to Transmission as `files-unwanted` in `torrent-add`.

## Non-goals
- Magnet links: the file list is unknown until metadata arrives from peers. Those
  keep the current flow (pick files later in the Files tab).
- Per-file priority in the add dialog.
- Showing a list for single-file torrents (nothing to choose).

## Constraints
- Inline styles only, no new dependencies, no `console.log` (see CLAUDE.md).
- File indices must match Transmission's order, i.e. the order of `info.files`.

## Approaches considered
1. **Parse the `.torrent` in the browser (chosen).** A small bencode parser reads
   `info.files`; `files-unwanted` goes straight into `torrent-add`. No dependency,
   nothing starts downloading by accident.
2. Add paused, then let the user pick files in the Files tab. Not what was asked,
   and an extra manual step.
3. Add normally, then immediately `torrent-set files-unwanted`. Race: some unwanted
   data may begin downloading first.

## Design
- New `src/utils/torrentFiles.ts`: minimal bencode decoder over `Uint8Array`
  (byte strings kept as bytes) and `parseTorrentFiles(bytes)` returning
  `{ path: string; length: number }[]`. Path = `path.utf-8` if present, else `path`
  decoded as UTF-8, joined with `/`. Single-file torrents return one entry (UI hides it).
- `AddDialog`: keep the raw bytes read from the file, parse them, hold a
  `Set<number>` of unticked indices. Render a scrollable list (`max-height`)
  under the drop zone when there are 2+ files. If parsing fails, show no list and
  add the torrent as before.
- `onAdd` params gain optional `unwantedFiles?: number[]`; `MainWindow.handleAdd`
  forwards it to `rpc.addTorrentFile(metainfo, dir, paused, unwantedFiles?)`, which
  adds `'files-unwanted'` only when the array is non-empty.
- Disable "Add" if every file is unticked.

## Left to the builder
Exact row layout and styling tokens; whether to render a folder tree or a flat
list of paths (flat is fine).
