import React, { useCallback, useEffect, useRef, useState } from 'react'
import * as F from '../utils/format'
import { Toolbar } from './Toolbar'
import { Sidebar } from './Sidebar'
import { TorrentTable } from './TorrentTable'
import { DetailsPanel } from './DetailsPanel'
import { StatusBar } from './StatusBar'
import { AddDialog } from './AddDialog'
import { SettingsDialog } from './SettingsDialog'
import { TorrentPropertiesDialog } from './TorrentPropertiesDialog'
import { Dialog } from '../components/feedback/Dialog'
import { Button } from '../components/controls/Button'
import { Input } from '../components/controls/Input'
import { ContextMenu, type MenuItem } from '../components/feedback/ContextMenu'
import * as rpc from '../api/rpc'
import type { Torrent, TorrentDetails, SessionInfo } from '../api/types'

type DialogState =
  | null
  | 'add'
  | 'settings'
  | { kind: 'confirm-remove'; ids: number[] }
  | { kind: 'confirm-data'; ids: number[] }
  | { kind: 'location'; id: number; current: string }
  | { kind: 'rename'; id: number; name: string }
  | { kind: 'properties'; id: number; name: string }

const POLL_INTERVAL = 3000

export function MainWindow() {
  const [torrents, setTorrents] = useState<Torrent[]>([])
  const [details, setDetails] = useState<TorrentDetails | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<number[]>([])
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'addedDate', dir: 'desc' })
  const [menu, setMenu] = useState<{ x: number; y: number; torrent: Torrent } | null>(null)
  const [detailsH, setDetailsH] = useState(208)
  const [search, setSearch] = useState('')
  const [altSpeed, setAltSpeed] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [locationInput, setLocationInput] = useState('')
  const [renameInput, setRenameInput] = useState('')
  const [detailsKey, setDetailsKey] = useState(0)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastClickRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await rpc.getTorrents()
      setTorrents(list)
    } catch {
      // will retry next tick
    }
  }, [])

  // Load session once on mount
  useEffect(() => {
    rpc.getSession().then(s => {
      setSession(s)
      setAltSpeed(s['alt-speed-enabled'])
    }).catch(() => {})
  }, [])

  // Polling
  useEffect(() => {
    refresh()
    pollRef.current = setInterval(refresh, POLL_INTERVAL)

    const vis = () => {
      if (document.hidden) {
        if (pollRef.current) clearInterval(pollRef.current)
      } else {
        refresh()
        pollRef.current = setInterval(refresh, POLL_INTERVAL)
      }
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [refresh])

  // Load details for selected torrent
  useEffect(() => {
    if (!selected.length) { setDetails(null); return }
    rpc.getTorrentDetails(selected[0]!).then(setDetails).catch(() => setDetails(null))
  }, [selected, detailsKey])

  const refreshDetails = useCallback(() => setDetailsKey(k => k + 1), [])

  // Dynamic page title
  useEffect(() => {
    const down = torrents.reduce((s, t) => s + t.rateDownload, 0)
    const up   = torrents.reduce((s, t) => s + t.rateUpload, 0)
    const active = torrents.filter(t => t.status === 'downloading' || t.status === 'seeding').length
    if (active > 0) {
      document.title = `↓ ${F.rate(down)}  ↑ ${F.rate(up)}  — Transmission`
    } else {
      document.title = `Transmission (${torrents.length})`
    }
  }, [torrents])

  // Filtered + sorted view
  const trackerHost = (url: string) => { try { return new URL(url).hostname } catch { return url } }

  let view = torrents.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'all') return true
    if (filter.startsWith('dir:'))     return t.downloadDir === filter.slice(4)
    if (filter.startsWith('tracker:')) return t.trackers.some(tr => trackerHost(tr.announce) === filter.slice(8))
    return t.status === filter
  })
  view = [...view].sort((a, b) => {
    const k = sort.key
    const av: number | string = k === 'peers' ? a.seedsConnected : (a[k as keyof Torrent] as number | string)
    const bv: number | string = k === 'peers' ? b.seedsConnected : (b[k as keyof Torrent] as number | string)
    if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
    return sort.dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const toggleSort = (key: string) =>
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' })

  const selectRow = (id: number, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickRef.current !== null) {
      const lastIdx = view.findIndex(t => t.id === lastClickRef.current)
      const currIdx = view.findIndex(t => t.id === id)
      if (lastIdx >= 0 && currIdx >= 0) {
        const lo = Math.min(lastIdx, currIdx)
        const hi = Math.max(lastIdx, currIdx)
        setSelected(view.slice(lo, hi + 1).map(t => t.id))
      }
    } else if (e.metaKey || e.ctrlKey) {
      setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
      lastClickRef.current = id
    } else {
      setSelected([id])
      lastClickRef.current = id
    }
  }

  const immediateRefresh = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    refresh()
    pollRef.current = setInterval(refresh, POLL_INTERVAL)
  }

  const handleAction = async (action: 'start' | 'pause' | 'delete') => {
    if (!selected.length) return
    if (action === 'start')  { await rpc.startTorrents(selected); immediateRefresh() }
    if (action === 'pause')  { await rpc.stopTorrents(selected); immediateRefresh() }
    if (action === 'delete') { setDialog({ kind: 'confirm-remove', ids: selected }) }
  }

  const handleRemove = async (ids: number[], deleteData = false) => {
    await rpc.removeTorrents(ids, deleteData)
    setSelected(s => s.filter(x => !ids.includes(x)))
    immediateRefresh()
  }

  const handleMoveLocation = async (id: number, location: string) => {
    await rpc.moveTorrent(id, location)
    immediateRefresh()
  }

  const openContext = (t: Torrent, e: React.MouseEvent) => {
    if (!selected.includes(t.id)) setSelected([t.id])
    setMenu({ x: e.clientX, y: e.clientY, torrent: t })
  }

  const contextItems = (t: Torrent): MenuItem[] => {
    const ids = selected.includes(t.id) ? selected : [t.id]
    const single = ids.length === 1
    return [
      { label: 'Start',       icon: 'play',       onClick: () => rpc.startTorrents(ids).then(immediateRefresh) },
      { label: 'Force Start', icon: 'zap',        onClick: () => rpc.forceStartTorrents(ids).then(immediateRefresh) },
      { label: 'Stop',        icon: 'pause',      onClick: () => rpc.stopTorrents(ids).then(immediateRefresh) },
      { separator: true },
      { label: 'Remove',             icon: 'trash-2',    onClick: () => setDialog({ kind: 'confirm-remove', ids }) },
      { label: 'Remove With Data…',  icon: 'trash-2',    danger: true, onClick: () => setDialog({ kind: 'confirm-data', ids }) },
      { separator: true },
      { label: 'Re-announce',  icon: 'radio',      onClick: () => rpc.reannounce(ids).then(immediateRefresh) },
      { label: 'Recheck',      icon: 'refresh-cw', onClick: () => rpc.recheckTorrents(ids).then(immediateRefresh) },
      { separator: true },
      {
        label: 'Priority', submenu: [
          { label: '↑ High',  onClick: () => rpc.setTorrentPriority(ids, 'high') },
          { label: 'Normal',  onClick: () => rpc.setTorrentPriority(ids, 'normal') },
          { label: '↓ Low',   onClick: () => rpc.setTorrentPriority(ids, 'low') },
        ],
      },
      {
        label: 'Queue', submenu: [
          { label: 'Move to Top',    onClick: () => rpc.queueMove(ids, 'top').then(immediateRefresh) },
          { label: 'Move Up',        onClick: () => rpc.queueMove(ids, 'up').then(immediateRefresh) },
          { label: 'Move Down',      onClick: () => rpc.queueMove(ids, 'down').then(immediateRefresh) },
          { label: 'Move to Bottom', onClick: () => rpc.queueMove(ids, 'bottom').then(immediateRefresh) },
        ],
      },
      { separator: true },
      { label: 'Copy Magnet Link', icon: 'link',    disabled: !single, onClick: () => rpc.getMagnetLink(t.id).then(link => navigator.clipboard.writeText(link)) },
      { label: 'Set Location…',                     disabled: !single, onClick: () => { setLocationInput(t.downloadDir); setDialog({ kind: 'location', id: t.id, current: t.downloadDir }) } },
      { label: 'Rename…',          icon: 'pencil',  disabled: !single, onClick: () => { setRenameInput(t.name); setDialog({ kind: 'rename', id: t.id, name: t.name }) } },
      { separator: true },
      { label: 'Properties…',                       disabled: !single, onClick: () => setDialog({ kind: 'properties', id: t.id, name: t.name }) },
    ]
  }

  const handleAdd = async (params: { magnetOrFile: string; isFile: boolean; dir: string; paused: boolean }) => {
    if (params.isFile) {
      await rpc.addTorrentFile(params.magnetOrFile, params.dir, params.paused)
    } else {
      await rpc.addMagnet(params.magnetOrFile, params.dir, params.paused)
    }
    setDialog(null)
    immediateRefresh()
  }

  const handleSaveSession = async (patch: Partial<SessionInfo>) => {
    await rpc.setSession(patch)
    if ('alt-speed-enabled' in patch && patch['alt-speed-enabled'] !== undefined) {
      setAltSpeed(patch['alt-speed-enabled'])
    }
    rpc.getSession().then(setSession).catch(() => {})
  }

  const toggleAlt = async () => {
    const next = !altSpeed
    setAltSpeed(next)
    await rpc.setSession({ 'alt-speed-enabled': next })
  }

  const sel = torrents.find(t => t.id === selected[0])
  const dirs = [...new Set(torrents.map(t => t.downloadDir))].sort()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--app-bg)', color: 'var(--text)', overflow: 'hidden' }}>
      <Toolbar
        selCount={selected.length}
        onAdd={() => setDialog('add')}
        onSettings={() => setDialog('settings')}
        onAction={handleAction}
        search={search}
        onSearch={setSearch}
        altSpeed={altSpeed}
        onToggleAlt={toggleAlt}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar torrents={torrents} filter={filter} onFilter={setFilter} />

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <TorrentTable
            torrents={view}
            selected={selected}
            onSelect={selectRow}
            onDoubleClick={t => setDialog({ kind: 'properties', id: t.id, name: t.name })}
            onContext={openContext}
            sort={sort}
            onSort={toggleSort}
          />
          {sel && (
            <DetailsPanel
              torrent={sel}
              details={details}
              height={detailsH}
              onResize={setDetailsH}
              onRefreshDetails={refreshDetails}
            />
          )}
        </div>
      </div>

      <StatusBar torrents={torrents} altSpeed={altSpeed} version={session?.version ?? ''} freeSpace={session?.['download-dir-free-space']} />

      {/* Context menu */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={contextItems(menu.torrent)}
          onClose={() => setMenu(null)}
        />
      )}

      {/* Dialogs */}
      {dialog === 'add' && (
        <AddDialog dirs={dirs} onClose={() => setDialog(null)} onAdd={handleAdd} />
      )}

      {dialog === 'settings' && (
        <SettingsDialog session={session} onClose={() => setDialog(null)} onSave={handleSaveSession} />
      )}

      {dialog && typeof dialog === 'object' && dialog.kind === 'confirm-remove' && (
        <Dialog title="Remove Torrent" width={400} onClose={() => setDialog(null)} footer={
          <>
            <Button onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => { handleRemove(dialog.ids); setDialog(null) }}>Remove</Button>
          </>
        }>
          <p style={{ margin: 0, fontSize: 'var(--fs-md)', lineHeight: 'var(--lh-normal)' }}>
            Remove <b>{dialog.ids.length}</b> torrent{dialog.ids.length > 1 ? 's' : ''} from the list? Downloaded data is kept on disk.
          </p>
        </Dialog>
      )}

      {dialog && typeof dialog === 'object' && dialog.kind === 'confirm-data' && (
        <Dialog title="Remove With Data" width={400} onClose={() => setDialog(null)} footer={
          <>
            <Button onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => { handleRemove(dialog.ids, true); setDialog(null) }} style={{ background: 'var(--status-error)', borderColor: 'var(--status-error)' }}>Delete Data</Button>
          </>
        }>
          <p style={{ margin: 0, fontSize: 'var(--fs-md)', lineHeight: 'var(--lh-normal)' }}>
            Permanently delete the downloaded data of <b>{dialog.ids.length}</b> torrent{dialog.ids.length > 1 ? 's' : ''}? This cannot be undone.
          </p>
        </Dialog>
      )}

      {dialog && typeof dialog === 'object' && dialog.kind === 'rename' && (
        <Dialog title="Rename" width={420} onClose={() => setDialog(null)} footer={
          <>
            <Button onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="primary" onClick={async () => {
              await rpc.renameTorrent(dialog.id, dialog.name, renameInput)
              immediateRefresh()
              setDialog(null)
            }}>Rename</Button>
          </>
        }>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>New name</span>
            <Input value={renameInput} onChange={e => setRenameInput(e.target.value)} containerStyle={{ width: '100%' }}
              onKeyDown={e => { if (e.key === 'Enter') { rpc.renameTorrent(dialog.id, dialog.name, renameInput).then(immediateRefresh); setDialog(null) }}} />
          </label>
        </Dialog>
      )}

      {dialog && typeof dialog === 'object' && dialog.kind === 'properties' && (
        <TorrentPropertiesDialog torrentId={dialog.id} torrentName={dialog.name} onClose={() => setDialog(null)} />
      )}

      {dialog && typeof dialog === 'object' && dialog.kind === 'location' && (
        <Dialog title="Set Location" width={420} onClose={() => setDialog(null)} footer={
          <>
            <Button onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => { handleMoveLocation(dialog.id, locationInput); setDialog(null) }}>Apply</Button>
          </>
        }>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>New location</span>
            <Input mono value={locationInput} onChange={e => setLocationInput(e.target.value)} containerStyle={{ width: '100%' }} />
          </label>
        </Dialog>
      )}
    </div>
  )
}
