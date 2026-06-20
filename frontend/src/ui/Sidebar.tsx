import { useCallback, useState } from 'react'
import React from 'react'
import { SidebarItem } from '../components/navigation/SidebarItem'
import type { Torrent, TorrentStatus } from '../api/types'

const SIDEBAR_W_KEY = 'transmission-sidebar-w'
const DEFAULT_W = 188
const MIN_W = 120
const MAX_W = 400

function loadWidth(): number {
  try {
    const v = localStorage.getItem(SIDEBAR_W_KEY)
    if (v) return Math.max(MIN_W, Math.min(MAX_W, Number(v)))
  } catch {}
  return DEFAULT_W
}

interface SidebarProps {
  torrents: Torrent[]
  filter: string
  onFilter: (f: string) => void
}

const STATUSES: { id: TorrentStatus; label: string; dot: string }[] = [
  { id: 'downloading', label: 'Downloading', dot: 'var(--status-download)' },
  { id: 'seeding',     label: 'Seeding',     dot: 'var(--status-seed)' },
  { id: 'paused',      label: 'Paused',      dot: 'var(--status-paused)' },
  { id: 'checking',    label: 'Checking',    dot: 'var(--status-check)' },
  { id: 'error',       label: 'Error',       dot: 'var(--status-error)' },
]

function trackerHost(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

export function Sidebar({ torrents, filter, onFilter }: SidebarProps) {
  const [width, setWidth] = useState(loadWidth)
  const count = (pred: (t: Torrent) => boolean) => torrents.filter(pred).length
  const dirs = [...new Set(torrents.map(t => t.downloadDir))].sort()

  // Collect unique tracker hostnames with counts
  const trackerCounts = new Map<string, number>()
  for (const t of torrents) {
    const seen = new Set<string>()
    for (const tr of t.trackers) {
      const host = trackerHost(tr.announce)
      if (!seen.has(host)) {
        seen.add(host)
        trackerCounts.set(host, (trackerCounts.get(host) ?? 0) + 1)
      }
    }
  }
  const trackers = [...trackerCounts.entries()].sort((a, b) => b[1] - a[1])

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width

    const move = (ev: MouseEvent) => {
      const newW = Math.max(MIN_W, Math.min(MAX_W, startW + (ev.clientX - startX)))
      setWidth(newW)
    }
    const up = (ev: MouseEvent) => {
      const finalW = Math.max(MIN_W, Math.min(MAX_W, startW + (ev.clientX - startX)))
      localStorage.setItem(SIDEBAR_W_KEY, String(finalW))
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [width])

  return (
    <div style={{ position: 'relative', width, flex: 'none', display: 'flex' }}>
      <div
        style={{
          flex: 1,
          background: 'var(--surface)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Status section */}
        <div style={{ padding: '6px 6px 4px' }}>
          <div className="section-label" style={{ padding: '4px 8px 4px' }}>Status</div>
          <SidebarItem label="All" count={torrents.length} active={filter === 'all'} onClick={() => onFilter('all')} />
          {STATUSES.map(s => (
            <SidebarItem
              key={s.id}
              label={s.label}
              dotColor={s.dot}
              count={count(t => t.status === s.id)}
              active={filter === s.id}
              onClick={() => onFilter(s.id)}
            />
          ))}
        </div>

        <Divider />

        {/* Folders section */}
        <div style={{ padding: '4px 6px' }}>
          <div className="section-label" style={{ padding: '4px 8px 4px' }}>Folders</div>
          {dirs.map(d => (
            <SidebarItem
              key={d}
              label={d}
              icon="folder"
              mono
              count={count(t => t.downloadDir === d)}
              active={filter === 'dir:' + d}
              onClick={() => onFilter('dir:' + d)}
            />
          ))}
          {dirs.length === 0 && <EmptyHint text="No folders" />}
        </div>

        {/* Trackers section */}
        {trackers.length > 0 && (
          <>
            <Divider />
            <div style={{ padding: '4px 6px 8px' }}>
              <div className="section-label" style={{ padding: '4px 8px 4px' }}>Trackers</div>
              {trackers.map(([host, n]) => (
                <SidebarItem
                  key={host}
                  label={host}
                  icon="radio"
                  mono
                  count={n}
                  active={filter === 'tracker:' + host}
                  onClick={() => onFilter('tracker:' + host)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Vertical resize handle */}
      <div
        onMouseDown={startResize}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 5,
          height: '100%',
          cursor: 'col-resize',
          zIndex: 1,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-end',
        }}
      >
        <div style={{ width: 1, background: 'var(--border)' }} />
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
}

function EmptyHint({ text }: { text: string }) {
  return <div style={{ padding: '2px 8px 4px', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{text}</div>
}
