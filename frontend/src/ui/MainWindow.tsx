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
import { Icon } from '../components/controls/Icon'
import { Input } from '../components/controls/Input'
import { ContextMenu, type MenuItem } from '../components/feedback/ContextMenu'
import * as rpc from '../api/rpc'
import { AuthRequiredError } from '../api/rpc'
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
  | { kind: 'new-label'; ids: number[] }

function getLabelPresets(): string[] {
  try { return JSON.parse(localStorage.getItem('transmission-label-presets') ?? '[]') } catch { return [] }
}

function getDirPresets(): string[] {
  try { return JSON.parse(localStorage.getItem('transmission-dir-presets') ?? '[]') } catch { return [] }
}

const POLL_INTERVAL = 3000

export function MainWindow() {
  const [torrents, setTorrents] = useState<Torrent[]>([])
  const [details, setDetails] = useState<TorrentDetails | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<number[]>([])
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'addedDate', dir: 'desc' })
  const [menu, setMenu] = useState<{ x: number; y: number; torrent: Torrent } | null>(null)
  const [sidebarMenu, setSidebarMenu] = useState<{ x: number; y: number; filterKey: string } | null>(null)
  const [detailsH, setDetailsH] = useState<number | undefined>(() => {
    const v = localStorage.getItem('transmission-details-h')
    return v ? Number(v) : undefined
  })
  const [search, setSearch] = useState('')
  const [altSpeed, setAltSpeed] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [locationInput, setLocationInput] = useState('')
  const [renameInput, setRenameInput] = useState('')
  const [newLabelInput, setNewLabelInput] = useState('')
  const [detailsKey, setDetailsKey] = useState(0)
  const [authRequired, setAuthRequired] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastClickRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await rpc.getTorrents()
      setTorrents(list)
      setAuthRequired(false)
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        setAuthRequired(true)
      }
      // will retry next tick — self-heals once the RPC endpoint is reachable again
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

  // Keep per-file progress live while the selected torrent is being checked.
  useEffect(() => {
    if (torrents.find(t => t.id === selected[0])?.status === 'checking') refreshDetails()
  }, [torrents, selected, refreshDetails])

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
    if (filter.startsWith('label:'))   return t.labels.includes(filter.slice(6))
    if (filter === 'no-label')         return t.labels.length === 0
    if (filter === 'active')           return t.rateDownload > 0 || t.rateUpload > 0
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

  // Keyboard shortcuts: Up/Down navigate selection, Insert adds a torrent,
  // Delete/Shift+Delete remove, F2 renames, Alt+Enter opens Properties.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (document.activeElement?.closest('[role="dialog"]')) return

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (!view.length) return

        const dir = e.key === 'ArrowDown' ? 1 : -1
        const lastId = lastClickRef.current
        const currIdx = lastId !== null ? view.findIndex(t => t.id === lastId) : -1
        const nextIdx = currIdx < 0
          ? (dir === 1 ? 0 : view.length - 1)
          : Math.max(0, Math.min(view.length - 1, currIdx + dir))
        const nextId = view[nextIdx]!.id
        lastClickRef.current = nextId
        setSelected([nextId])
        return
      }

      if (e.key === 'Insert') {
        e.preventDefault()
        setDialog('add')
        return
      }

      if (e.key === 'Delete') {
        if (!selected.length) return
        e.preventDefault()
        setDialog(e.shiftKey ? { kind: 'confirm-data', ids: selected } : { kind: 'confirm-remove', ids: selected })
        return
      }

      if (e.key === 'F2') {
        if (selected.length !== 1) return
        const t = torrents.find(x => x.id === selected[0])
        if (!t) return
        e.preventDefault()
        setRenameInput(t.name)
        setDialog({ kind: 'rename', id: t.id, name: t.name })
        return
      }

      if (e.key === 'Enter' && e.altKey) {
        if (selected.length !== 1) return
        const t = torrents.find(x => x.id === selected[0])
        if (!t) return
        e.preventDefault()
        setDialog({ kind: 'properties', id: t.id, name: t.name })
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [view, selected, torrents])

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
    const selectedTs = torrents.filter(st => ids.includes(st.id))

    // All known labels: from presets + from every torrent currently in the list
    const allKnownLabels = [...new Set([
      ...getLabelPresets(),
      ...torrents.flatMap(st => st.labels),
    ])].sort()

    const applyLabelToggle = (lbl: string) => {
      const allHave = selectedTs.every(st => st.labels.includes(lbl))
      Promise.all(
        selectedTs.map(st => rpc.setTorrentLabels(
          st.id,
          allHave ? st.labels.filter(l => l !== lbl) : [...new Set([...st.labels, lbl])],
        ))
      ).then(immediateRefresh).catch(() => {})
    }

    return [
      { label: 'Start',       icon: 'play',       onClick: () => rpc.startTorrents(ids).then(immediateRefresh) },
      { label: 'Force Start', icon: 'zap',        onClick: () => rpc.forceStartTorrents(ids).then(immediateRefresh) },
      { label: 'Stop',        icon: 'pause',      onClick: () => rpc.stopTorrents(ids).then(immediateRefresh) },
      { separator: true },
      { label: 'Remove',             icon: 'trash-2',    shortcut: 'Del',       onClick: () => setDialog({ kind: 'confirm-remove', ids }) },
      { label: 'Remove With Data…',  icon: 'trash-2',    shortcut: 'Shift+Del', danger: true, onClick: () => setDialog({ kind: 'confirm-data', ids }) },
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
      {
        label: 'Labels',
        icon: 'tag',
        submenu: [
          ...allKnownLabels.map(lbl => {
            const allHave  = selectedTs.every(st => st.labels.includes(lbl))
            const someHave = selectedTs.some(st => st.labels.includes(lbl))
            return { label: lbl, icon: allHave ? 'check' : someHave ? 'minus' : undefined, onClick: () => applyLabelToggle(lbl) }
          }),
          ...(allKnownLabels.length > 0 ? [{ separator: true }] : []),
          { label: 'New label…', icon: 'plus', onClick: () => { setNewLabelInput(''); setDialog({ kind: 'new-label', ids }) } },
        ],
      },
      { separator: true },
      { label: 'Copy Magnet Link', icon: 'link',    disabled: !single, onClick: () => rpc.getMagnetLink(t.id).then(link => navigator.clipboard.writeText(link)) },
      { label: 'Set Location…',                     disabled: !single, onClick: () => { setLocationInput(t.downloadDir); setDialog({ kind: 'location', id: t.id, current: t.downloadDir }) } },
      { label: 'Rename…',          icon: 'pencil',  shortcut: 'F2',        disabled: !single, onClick: () => { setRenameInput(t.name); setDialog({ kind: 'rename', id: t.id, name: t.name }) } },
      { separator: true },
      { label: 'Properties…',                       shortcut: 'Alt+Enter', disabled: !single, onClick: () => setDialog({ kind: 'properties', id: t.id, name: t.name }) },
    ]
  }

  const getSidebarTorrentIds = (filterKey: string): number[] =>
    torrents.filter(t => {
      if (filterKey === 'all')               return true
      if (filterKey === 'no-label')          return t.labels.length === 0
      if (filterKey === 'active')            return t.rateDownload > 0 || t.rateUpload > 0
      if (filterKey.startsWith('dir:'))      return t.downloadDir === filterKey.slice(4)
      if (filterKey.startsWith('tracker:'))  return t.trackers.some(tr => trackerHost(tr.announce) === filterKey.slice(8))
      if (filterKey.startsWith('label:'))    return t.labels.includes(filterKey.slice(6))
      return t.status === filterKey
    }).map(t => t.id)

  const sidebarContextItems = (filterKey: string): MenuItem[] => {
    const ids = getSidebarTorrentIds(filterKey)
    const ts  = torrents.filter(t => ids.includes(t.id))
    if (!ids.length) return [{ label: 'No torrents in this group', disabled: true }]

    const allKnownLabels = [...new Set([...getLabelPresets(), ...torrents.flatMap(t => t.labels)])].sort()
    const applyLabel = (lbl: string) => {
      const allHave = ts.every(t => t.labels.includes(lbl))
      Promise.all(ts.map(t => rpc.setTorrentLabels(t.id, allHave
        ? t.labels.filter(l => l !== lbl)
        : [...new Set([...t.labels, lbl])])
      )).then(immediateRefresh).catch(() => {})
    }

    return [
      { label: 'Start All',    icon: 'play',       onClick: () => rpc.startTorrents(ids).then(immediateRefresh) },
      { label: 'Stop All',     icon: 'pause',      onClick: () => rpc.stopTorrents(ids).then(immediateRefresh) },
      { separator: true },
      { label: 'Re-announce',  icon: 'radio',      onClick: () => rpc.reannounce(ids).then(immediateRefresh) },
      { label: 'Recheck',      icon: 'refresh-cw', onClick: () => rpc.recheckTorrents(ids).then(immediateRefresh) },
      { separator: true },
      {
        label: 'Labels', icon: 'tag',
        submenu: [
          ...allKnownLabels.map(lbl => {
            const allHave  = ts.every(t => t.labels.includes(lbl))
            const someHave = ts.some(t => t.labels.includes(lbl))
            return { label: lbl, icon: allHave ? 'check' : someHave ? 'minus' : undefined, onClick: () => applyLabel(lbl) }
          }),
          ...(allKnownLabels.length > 0 ? [{ separator: true }] : []),
          { label: 'New label…', icon: 'plus', onClick: () => { setNewLabelInput(''); setDialog({ kind: 'new-label', ids }) } },
        ],
      },
      { separator: true },
      { label: 'Remove All…',         icon: 'trash-2', onClick: () => setDialog({ kind: 'confirm-remove', ids }) },
      { label: 'Remove With Data…',   icon: 'trash-2', danger: true, onClick: () => setDialog({ kind: 'confirm-data', ids }) },
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
  const dirs = [...new Set([...getDirPresets(), ...torrents.map(t => t.downloadDir)])].sort()

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

      {authRequired && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', background: 'color-mix(in srgb, var(--status-error) 10%, var(--surface))', borderBottom: '1px solid color-mix(in srgb, var(--status-error) 25%, transparent)', flex: 'none' }}>
          <Icon name="x" size={14} style={{ color: 'var(--status-error)', flex: 'none' }} />
          <span style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>
            Transmission RPC requires authentication. Add your username and password in Settings.
          </span>
          <Button size="sm" onClick={() => setDialog('settings')}>Open Settings</Button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          torrents={torrents}
          filter={filter}
          onFilter={setFilter}
          onSidebarContext={(key, x, y) => setSidebarMenu({ filterKey: key, x, y })}
        />

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
              onResize={h => { setDetailsH(h); localStorage.setItem('transmission-details-h', String(h)) }}
              onRefreshDetails={refreshDetails}
            />
          )}
        </div>
      </div>

      <StatusBar torrents={torrents} altSpeed={altSpeed} version={session?.version ?? ''} freeSpace={session?.['download-dir-free-space']} />

      {/* Context menus */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={contextItems(menu.torrent)}
          onClose={() => setMenu(null)}
        />
      )}
      {sidebarMenu && (
        <ContextMenu
          x={sidebarMenu.x}
          y={sidebarMenu.y}
          items={sidebarContextItems(sidebarMenu.filterKey)}
          onClose={() => setSidebarMenu(null)}
        />
      )}

      {/* Dialogs */}
      {dialog === 'add' && (
        <AddDialog dirs={dirs} onClose={() => setDialog(null)} onAdd={handleAdd} />
      )}

      {dialog === 'settings' && (
        <SettingsDialog session={session} onClose={() => {
          setDialog(null)
          // If polling was paused due to auth error, try again after settings change.
          if (authRequired) immediateRefresh()
        }} onSave={handleSaveSession} />
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

      {dialog && typeof dialog === 'object' && dialog.kind === 'new-label' && (() => {
        const applyNewLabel = async () => {
          const lbl = newLabelInput.trim()
          if (!lbl) return
          const selectedTs = torrents.filter(t => (dialog as { kind: 'new-label'; ids: number[] }).ids.includes(t.id))
          await Promise.all(selectedTs.map(st => rpc.setTorrentLabels(st.id, [...new Set([...st.labels, lbl])])))
          immediateRefresh()
          setDialog(null)
        }
        return (
          <Dialog title="New Label" width={360} onClose={() => setDialog(null)} footer={
            <>
              <Button onClick={() => setDialog(null)}>Cancel</Button>
              <Button variant="primary" onClick={applyNewLabel} disabled={!newLabelInput.trim()}>Apply</Button>
            </>
          }>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Label name</span>
              <Input
                value={newLabelInput}
                onChange={e => setNewLabelInput(e.target.value)}
                containerStyle={{ width: '100%' }}
                onKeyDown={e => { if (e.key === 'Enter') applyNewLabel() }}
                autoFocus
              />
            </label>
          </Dialog>
        )
      })()}

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
