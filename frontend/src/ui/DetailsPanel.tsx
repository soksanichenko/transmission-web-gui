import React, { useCallback, useRef, useState } from 'react'
import { Tabs } from '../components/navigation/Tabs'
import { ProgressBar } from '../components/data/ProgressBar'
import { Icon } from '../components/controls/Icon'
import { ContextMenu } from '../components/feedback/ContextMenu'
import { GraphTab } from './GraphTab'
import type { Torrent, TorrentDetails } from '../api/types'
import * as F from '../utils/format'
import { useResizableCols } from '../utils/useResizableCols'
import * as rpc from '../api/rpc'

const TAB_BAR_H = 28
const DRAG_H = 5

interface DetailsPanelProps {
  torrent: Torrent
  details: TorrentDetails | null
  /** Optional cap; when omitted the panel auto-sizes to InfoTab content. */
  height?: number
  onResize: (h: number) => void
  onRefreshDetails: () => void
}

export function DetailsPanel({ torrent, details, height, onResize, onRefreshDetails }: DetailsPanelProps) {
  const [tab, setTab] = useState(() => localStorage.getItem('transmission-details-tab') ?? 'info')
  const panelRef = useRef<HTMLDivElement>(null)

  const handleTabChange = (id: string) => {
    setTab(id)
    localStorage.setItem('transmission-details-tab', id)
  }

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = panelRef.current?.getBoundingClientRect().height ?? height ?? 300
    const move = (ev: MouseEvent) => onResize(Math.max(120, Math.min(600, startH - (ev.clientY - startY))))
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  // When height is set by user drag, cap the scrollable content area.
  const contentMaxH = height != null ? height - TAB_BAR_H - DRAG_H : undefined

  return (
    <div
      ref={panelRef}
      style={{
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        ...(height != null ? { maxHeight: height, overflow: 'hidden' } : {}),
      }}
    >
      <div
        onMouseDown={startDrag}
        style={{ height: DRAG_H, cursor: 'ns-resize', flex: 'none', background: 'var(--chrome-bg)', borderBottom: '1px solid var(--border)' }}
      />

      <Tabs
        value={tab}
        onChange={handleTabChange}
        tabs={[
          { id: 'info',     label: 'Info',     icon: 'info' },
          { id: 'files',    label: 'Files',    icon: 'list',     count: details?.files.length ?? 0 },
          { id: 'peers',    label: 'Peers',    icon: 'users',    count: torrent.peersConnected },
          { id: 'trackers', label: 'Trackers', icon: 'radio' },
          { id: 'graph',    label: 'Graph',    icon: 'activity' },
        ]}
      />

      {/* InfoTab is always in the DOM — its natural height drives the panel size.
          Other tabs overlay it with position:absolute so they don't change the height. */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            visibility: tab === 'info' ? 'visible' : 'hidden',
            pointerEvents: tab === 'info' ? 'auto' : 'none',
            overflow: 'auto',
            ...(contentMaxH != null ? { maxHeight: contentMaxH } : {}),
          }}
        >
          <InfoTab torrent={torrent} details={details} />
        </div>

        {tab !== 'info' && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'auto', background: 'var(--surface)' }}>
            {tab === 'files'    && <FilesTab details={details} torrentId={torrent.id} onRefresh={onRefreshDetails} />}
            {tab === 'peers'    && <PeersTab details={details} />}
            {tab === 'trackers' && <TrackersTab details={details} />}
            {tab === 'graph'    && <GraphTab torrent={torrent} />}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function ResizableHeadRow({ cols, storageKey }: {
  cols: { label: string; defaultW: number; minW?: number; align?: string }[]
  storageKey: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { template, startResize, autoFit } = useResizableCols(
    cols.map(c => c.defaultW),
    storageKey,
    cols.map(c => c.minW ?? 40),
  )

  return { template, containerRef, headerEl: (
    <div style={{ display: 'grid', gridTemplateColumns: template, height: 22, position: 'sticky', top: 0, background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', zIndex: 1 }}>
      {cols.map((c, ci) => (
        <div
          key={c.label}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start', padding: '0 16px 0 10px', fontSize: 'var(--fs-2xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden' }}
        >
          {c.label}
          <div
            onMouseDown={e => startResize(e, ci)}
            onDoubleClick={e => autoFit(e, ci, containerRef.current)}
            onClick={e => e.stopPropagation()}
            title="Drag to resize · Double-click to auto-fit"
            style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{ width: 1, height: '60%', background: 'var(--border-faint)' }} />
          </div>
        </div>
      ))}
    </div>
  )}
}

function Mono({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums slashed-zero', fontSize: 'var(--fs-xs)', color: color ?? 'var(--text-secondary)' }}>
      {children}
    </span>
  )
}

function EmptyPane({ text }: { text: string }) {
  return <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{text}</div>
}

// ── Files tab ─────────────────────────────────────────────────────────────────

const FILES_COLS = [
  { label: 'File',     defaultW: 280, minW: 100 },
  { label: 'Size',     defaultW: 90,  minW: 50, align: 'right' },
  { label: 'Progress', defaultW: 140, minW: 80 },
  { label: 'Priority', defaultW: 90,  minW: 50, align: 'right' },
]

function FilesTab({ details, torrentId, onRefresh }: {
  details: TorrentDetails | null
  torrentId: number
  onRefresh: () => void
}) {
  const { template, headerEl, containerRef } = ResizableHeadRow({ cols: FILES_COLS, storageKey: 'transmission-files-cols' })
  const files = details?.files ?? []
  const stats = details?.fileStats ?? []

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [menu, setMenu] = useState<{ x: number; y: number; indices: number[] } | null>(null)
  const lastClickIdx = useRef<number>(-1)

  const handleRowClick = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault()
    if (e.shiftKey && lastClickIdx.current >= 0) {
      const lo = Math.min(lastClickIdx.current, idx)
      const hi = Math.max(lastClickIdx.current, idx)
      setSelected(prev => {
        const next = new Set(prev)
        for (let k = lo; k <= hi; k++) next.add(k)
        return next
      })
    } else if (e.ctrlKey || e.metaKey) {
      setSelected(prev => {
        const next = new Set(prev)
        next.has(idx) ? next.delete(idx) : next.add(idx)
        return next
      })
      lastClickIdx.current = idx
    } else {
      setSelected(new Set([idx]))
      lastClickIdx.current = idx
    }
  }, [])

  const handleContextMenu = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault()
    const indices = selected.has(idx) ? [...selected] : [idx]
    if (!selected.has(idx)) {
      setSelected(new Set([idx]))
      lastClickIdx.current = idx
    }
    setMenu({ x: e.clientX, y: e.clientY, indices })
  }, [selected])

  const act = useCallback((fn: () => Promise<void>) => {
    fn().then(onRefresh).catch(() => {})
    setMenu(null)
  }, [onRefresh])

  if (!files.length) return <EmptyPane text="No file data." />

  const menuItems = menu ? (() => {
    const allWanted = menu.indices.every(i => stats[i]?.wanted !== false)
    const allUnwanted = menu.indices.every(i => stats[i]?.wanted === false)
    return [
      { label: 'Download', icon: 'check',   disabled: allWanted,   onClick: () => act(() => rpc.setFilesWanted(torrentId, menu.indices, true)) },
      { label: 'Skip',     icon: 'x',       disabled: allUnwanted, onClick: () => act(() => rpc.setFilesWanted(torrentId, menu.indices, false)) },
      { separator: true },
      { header: 'Priority' },
      { label: '↑ High',  onClick: () => act(() => rpc.setFilePriority(torrentId, menu.indices, 'high')) },
      { label: 'Normal',  onClick: () => act(() => rpc.setFilePriority(torrentId, menu.indices, 'normal')) },
      { label: '↓ Low',   onClick: () => act(() => rpc.setFilePriority(torrentId, menu.indices, 'low')) },
    ]
  })() : []

  return (
    <div ref={containerRef} onContextMenu={e => e.preventDefault()}>
      {headerEl}
      {files.map((f, i) => {
        const st = stats[i]
        const progress = f.length > 0 ? (st?.bytesCompleted ?? 0) / f.length : 0
        const prio = st?.priority ?? 0
        const prioLabel = prio > 0 ? '↑ High' : prio < 0 ? '↓ Low' : 'Normal'
        const prioColor = prio > 0 ? 'var(--status-download)' : prio < 0 ? 'var(--text-muted)' : 'var(--text-secondary)'
        const isSelected = selected.has(i)
        const isUnwanted = st?.wanted === false
        return (
          <div
            key={f.name}
            onClick={e => handleRowClick(i, e)}
            onContextMenu={e => handleContextMenu(i, e)}
            style={{
              display: 'grid', gridTemplateColumns: template, height: 24, alignItems: 'center',
              background: isSelected ? 'var(--row-selected, var(--row-hover))' : i % 2 ? 'var(--row-stripe)' : 'transparent',
              borderBottom: '1px solid var(--border-faint)',
              cursor: 'default',
              userSelect: 'none',
              opacity: isUnwanted ? 0.45 : 1,
            }}
          >
            <div data-col="0" style={{ padding: '0 10px', display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--fs-sm)' }}>{f.name}</span>
            </div>
            <div data-col="1" style={{ padding: '0 10px', textAlign: 'right' }}><Mono>{F.size(f.length)}</Mono></div>
            <div data-col="2" style={{ padding: '0 10px' }}><ProgressBar value={progress} status={progress >= 1 ? 'seeding' : 'downloading'} /></div>
            <div data-col="3" style={{ padding: '0 10px', textAlign: 'right', fontSize: 'var(--fs-xs)', color: prioColor }}>{prioLabel}</div>
          </div>
        )
      })}
      {menu && <ContextMenu items={menuItems} x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
    </div>
  )
}

// ── Peers tab ─────────────────────────────────────────────────────────────────

const PEERS_COLS = [
  { label: 'IP',     defaultW: 130, minW: 80 },
  { label: 'Client', defaultW: 180, minW: 80 },
  { label: '↓',      defaultW: 90,  minW: 50, align: 'right' },
  { label: '↑',      defaultW: 90,  minW: 50, align: 'right' },
  { label: 'Flags',  defaultW: 80,  minW: 40, align: 'right' },
]

function PeersTab({ details }: { details: TorrentDetails | null }) {
  const { template, headerEl, containerRef } = ResizableHeadRow({ cols: PEERS_COLS, storageKey: 'transmission-peers-cols' })
  const peers = details?.peers ?? []
  if (!peers.length) return <EmptyPane text="No peers." />

  return (
    <div ref={containerRef}>
      {headerEl}
      {peers.map((p, i) => (
        <div key={p.address + i} style={{ display: 'grid', gridTemplateColumns: template, height: 24, alignItems: 'center', background: i % 2 ? 'var(--row-stripe)' : 'transparent', borderBottom: '1px solid var(--border-faint)' }}>
          <div data-col="0" style={{ padding: '0 10px', overflow: 'hidden' }}><Mono color="var(--text)">{p.address}</Mono></div>
          <div data-col="1" style={{ padding: '0 10px', overflow: 'hidden' }}>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--fs-sm)' }}>{p.clientName}</span>
          </div>
          <div data-col="2" style={{ padding: '0 10px', textAlign: 'right' }}><Mono color={p.rateToClient ? 'var(--status-download)' : undefined}>{F.rate(p.rateToClient)}</Mono></div>
          <div data-col="3" style={{ padding: '0 10px', textAlign: 'right' }}><Mono color={p.rateToPeer ? 'var(--status-seed)' : undefined}>{F.rate(p.rateToPeer)}</Mono></div>
          <div data-col="4" style={{ padding: '0 10px', textAlign: 'right' }}><Mono>{p.flagStr}</Mono></div>
        </div>
      ))}
    </div>
  )
}

// ── Trackers tab ──────────────────────────────────────────────────────────────

const TRACKERS_COLS = [
  { label: 'Tracker',       defaultW: 280, minW: 120 },
  { label: 'Status',        defaultW: 150, minW: 80 },
  { label: 'Next Announce', defaultW: 120, minW: 60, align: 'right' },
  { label: 'Seeds/Peers',   defaultW: 110, minW: 60, align: 'right' },
]

function TrackersTab({ details }: { details: TorrentDetails | null }) {
  const { template, headerEl, containerRef } = ResizableHeadRow({ cols: TRACKERS_COLS, storageKey: 'transmission-trackers-cols' })
  const trackers = details?.trackerStats ?? []
  if (!trackers.length) return <EmptyPane text="No trackers." />

  return (
    <div ref={containerRef}>
      {headerEl}
      {trackers.map((t, i) => {
        const err = /error/i.test(t.lastAnnounceResult)
        const work = /success/i.test(t.lastAnnounceResult) || t.seederCount > 0
        const nextIn = t.nextAnnounceTime > 0
          ? Math.max(0, t.nextAnnounceTime - Math.floor(Date.now() / 1000))
          : 0
        return (
          <div key={t.announce + i} style={{ display: 'grid', gridTemplateColumns: template, height: 24, alignItems: 'center', background: i % 2 ? 'var(--row-stripe)' : 'transparent', borderBottom: '1px solid var(--border-faint)' }}>
            <div data-col="0" style={{ padding: '0 10px', overflow: 'hidden' }}>
              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Mono color="var(--text)">{t.announce}</Mono>
              </span>
            </div>
            <div data-col="1" style={{ padding: '0 10px', fontSize: 'var(--fs-xs)', color: err ? 'var(--status-error)' : work ? 'var(--status-seed)' : 'var(--text-secondary)' }}>{t.lastAnnounceResult || '—'}</div>
            <div data-col="2" style={{ padding: '0 10px', textAlign: 'right' }}><Mono>{nextIn > 0 ? F.eta(nextIn) : '—'}</Mono></div>
            <div data-col="3" style={{ padding: '0 10px', textAlign: 'right' }}><Mono>{t.seederCount}/{t.lastAnnouncePeerCount}</Mono></div>
          </div>
        )
      })}
    </div>
  )
}

// ── Info tab ──────────────────────────────────────────────────────────────────

function InfoTab({ torrent, details }: { torrent: Torrent; details: TorrentDetails | null }) {
  const d = details

  const dlLimit = d?.downloadLimited ? F.rate(d.downloadLimit * 1024) : '—'
  const ulLimit = d?.uploadLimited   ? F.rate(d.uploadLimit * 1024)   : '—'
  const peerLimit = d?.peerLimit ?? 0
  const pieces = d ? `${d.pieceCount} × ${F.size(d.pieceSize)}` : '—'
  const timeSeeding = d?.secondsSeeding ? F.duration(d.secondsSeeding) : '—'
  const primaryTracker = d?.trackerStats[0]
    ? new URL(d.trackerStats[0].announce).hostname
    : '—'

  return (
    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 'var(--fs-sm)' }}>

      {/* Transfer + Connections in two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
        <Section label="Transfer">
          <Row label="Downloaded"   value={`${F.size(torrent.downloadedEver)} (${Math.round(torrent.percentDone * 100)}%)`} />
          <Row label="Uploaded"     value={d ? F.size(d.uploadedEver) : '—'} />
          <Row label="Corrupt"      value={d && d.corruptEver > 0 ? F.size(d.corruptEver) : '—'} />
          <Row label="Ratio"        value={torrent.uploadRatio >= 0 ? torrent.uploadRatio.toFixed(3) : '—'} mono />
          <Row label="Time seeding" value={timeSeeding} mono />
          <Row label="↓ Limit"      value={dlLimit} mono />
          <Row label="↑ Limit"      value={ulLimit} mono />
        </Section>

        <Section label="Connections">
          <Row label="Seeds"        value={String(torrent.seedsConnected)} mono />
          <Row label="Peers"        value={String(torrent.peersConnected)} mono />
          <Row label="Peer limit"   value={peerLimit > 0 ? String(peerLimit) : '—'} mono />
          <Row label="Tracker"      value={primaryTracker} />
          <Row label="Last active"  value={d?.activityDate ? F.date(d.activityDate) : '—'} mono />
        </Section>
      </div>

      <Divider />

      {/* Torrent metadata */}
      <Section label="Torrent">
        <Row label="Name"      value={torrent.name} />
        <Row label="Location"  value={torrent.downloadDir} mono />
        <Row label="Size"      value={`${F.size(torrent.totalSize)}`} mono />
        <Row label="Pieces"    value={pieces} mono />
        <Row label="Hash"      value={d?.hashString ?? '—'} mono copyable />
        <Row label="Added"     value={F.date(torrent.addedDate)} mono />
        <Row label="Completed" value={torrent.doneDate > 0 ? F.date(torrent.doneDate) : '—'} mono />
        {d?.dateCreated ? <Row label="Created"   value={`${F.date(d.dateCreated)}${d.creator ? ` by ${d.creator}` : ''}`} /> : null}
        {d?.comment    ? (
          <Row
            label="Comment"
            value={d.comment}
            href={/^https?:\/\//.test(d.comment) ? d.comment : undefined}
          />
        ) : null}
        {d?.magnetLink ? (
          <Row label="Magnet" value={d.magnetLink} mono clickToCopy truncate />
        ) : null}
      </Section>

      {torrent.error > 0 && torrent.errorString && (
        <>
          <Divider />
          <Section label="Error">
            <Row label="Message" value={torrent.errorString} color="var(--status-error)" />
          </Section>
        </>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border-faint)' }} />
}

function Row({
  label, value, mono = false, color, copyable = false, clickToCopy = false,
  href, truncate = false,
}: {
  label: string
  value: string
  mono?: boolean
  color?: string
  copyable?: boolean
  /** Makes the value text itself the copy trigger (no separate button). */
  clickToCopy?: boolean
  /** Renders value as an external link. */
  href?: string
  truncate?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const valueStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    fontSize: 'var(--fs-xs)',
    fontFamily: mono ? 'var(--font-mono)' : undefined,
    fontVariantNumeric: mono ? 'tabular-nums slashed-zero' : undefined,
    color: color ?? (href || clickToCopy ? 'var(--accent-500)' : 'var(--text)'),
    overflow: truncate ? 'hidden' : undefined,
    textOverflow: truncate ? 'ellipsis' : undefined,
    whiteSpace: truncate ? 'nowrap' : 'pre-wrap',
    wordBreak: truncate ? undefined : 'break-all',
    cursor: clickToCopy ? 'pointer' : undefined,
    textDecoration: href ? 'underline' : undefined,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
      <span style={{ flex: 'none', width: 90, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textAlign: 'right' }}>
        {label}
      </span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" style={valueStyle}>
          {value || '—'}
        </a>
      ) : (
        <span
          style={valueStyle}
          onClick={clickToCopy ? handleCopy : undefined}
          title={truncate ? value : clickToCopy ? (copied ? 'Copied!' : 'Click to copy') : undefined}
        >
          {copied ? <span style={{ color: 'var(--status-seed)' }}>Copied!</span> : (value || '—')}
        </span>
      )}
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy'}
          style={{ flex: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: copied ? 'var(--status-seed)' : 'var(--text-muted)', display: 'flex' }}
        >
          <Icon name={copied ? 'check' : 'copy'} size={12} />
        </button>
      )}
    </div>
  )
}
