import { useCallback, useState } from 'react'
import React from 'react'
import { SidebarItem } from '../components/navigation/SidebarItem'
import { Icon } from '../components/controls/Icon'
import type { Torrent, TorrentStatus } from '../api/types'

const SECTIONS_KEY = 'transmission-sidebar-sections'

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
  onSidebarContext: (filterKey: string, x: number, y: number) => void
}

const STATUSES: { id: TorrentStatus; label: string; dot: string }[] = [
  { id: 'downloading', label: 'Downloading', dot: 'var(--status-download)' },
  { id: 'seeding',     label: 'Seeding',     dot: 'var(--status-seed)' },
  { id: 'paused',      label: 'Paused',      dot: 'var(--status-paused)' },
  { id: 'checking',    label: 'Checking',    dot: 'var(--status-check)' },
  { id: 'queued',      label: 'Queued',      dot: 'var(--status-queued)' },
  { id: 'error',       label: 'Error',       dot: 'var(--status-error)' },
]

function trackerHost(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

export function Sidebar({ torrents, filter, onFilter, onSidebarContext }: SidebarProps) {
  const ctx = (key: string) => (e: React.MouseEvent) => { e.preventDefault(); onSidebarContext(key, e.clientX, e.clientY) }
  const [width, setWidth] = useState(loadWidth)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? '{}') } catch { return {} }
  })
  const toggleSection = (id: string) => setCollapsed(prev => {
    const next = { ...prev, [id]: !prev[id] }
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(next))
    return next
  })
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

  // Collect labels with counts (from torrents + preset list)
  const labelCounts = new Map<string, number>()
  for (const t of torrents) {
    for (const lbl of t.labels) {
      labelCounts.set(lbl, (labelCounts.get(lbl) ?? 0) + 1)
    }
  }
  try {
    const presets: string[] = JSON.parse(localStorage.getItem('transmission-label-presets') ?? '[]')
    for (const lbl of presets) {
      if (!labelCounts.has(lbl)) labelCounts.set(lbl, 0)
    }
  } catch {}
  const labels = [...labelCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))

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
          <SectionHeader label="Status" id="status" collapsed={collapsed} onToggle={toggleSection} />
          {!collapsed['status'] && <>
            <SidebarItem label="All" count={torrents.length} active={filter === 'all'} onClick={() => onFilter('all')} onContextMenu={ctx('all')} />
            <SidebarItem
              label="Active"
              dotColor="var(--status-download)"
              count={count(t => t.rateDownload > 0 || t.rateUpload > 0)}
              active={filter === 'active'}
              onClick={() => onFilter('active')}
              onContextMenu={ctx('active')}
            />
            {STATUSES.map(s => (
              <SidebarItem
                key={s.id}
                label={s.label}
                dotColor={s.dot}
                count={count(t => t.status === s.id)}
                active={filter === s.id}
                onClick={() => onFilter(s.id)}
                onContextMenu={ctx(s.id)}
              />
            ))}
          </>}
        </div>

        <Divider />

        {/* Folders section */}
        <div style={{ padding: '4px 6px' }}>
          <SectionHeader label="Folders" id="folders" collapsed={collapsed} onToggle={toggleSection} />
          {!collapsed['folders'] && <>
            {dirs.map(d => (
              <SidebarItem
                key={d}
                label={d}
                icon="folder"
                mono
                count={count(t => t.downloadDir === d)}
                active={filter === 'dir:' + d}
                onClick={() => onFilter('dir:' + d)}
                onContextMenu={ctx('dir:' + d)}
              />
            ))}
            {dirs.length === 0 && <EmptyHint text="No folders" />}
          </>}
        </div>

        {/* Trackers section */}
        {trackers.length > 0 && (
          <>
            <Divider />
            <div style={{ padding: '4px 6px 8px' }}>
              <SectionHeader label="Trackers" id="trackers" collapsed={collapsed} onToggle={toggleSection} />
              {!collapsed['trackers'] && trackers.map(([host, n]) => (
                <SidebarItem
                  key={host}
                  label={host}
                  icon="radio"
                  mono
                  count={n}
                  active={filter === 'tracker:' + host}
                  onClick={() => onFilter('tracker:' + host)}
                  onContextMenu={ctx('tracker:' + host)}
                />
              ))}
            </div>
          </>
        )}

        {/* Labels section */}
        {(labels.length > 0 || torrents.some(t => t.labels.length === 0)) && (
          <>
            <Divider />
            <div style={{ padding: '4px 6px 8px' }}>
              <SectionHeader label="Labels" id="labels" collapsed={collapsed} onToggle={toggleSection} />
              {!collapsed['labels'] && <>
                <SidebarItem
                  label="No label"
                  count={count(t => t.labels.length === 0)}
                  active={filter === 'no-label'}
                  onClick={() => onFilter('no-label')}
                  onContextMenu={ctx('no-label')}
                  style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}
                />
                {labels.map(([lbl, n]) => (
                  <SidebarItem
                    key={lbl}
                    label={lbl}
                    icon="tag"
                    count={n}
                    active={filter === 'label:' + lbl}
                    onClick={() => onFilter('label:' + lbl)}
                    onContextMenu={ctx('label:' + lbl)}
                  />
                ))}
              </>}
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

function SectionHeader({ label, id, collapsed, onToggle }: {
  label: string
  id: string
  collapsed: Record<string, boolean>
  onToggle: (id: string) => void
}) {
  return (
    <div
      onClick={() => onToggle(id)}
      style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px 4px', cursor: 'pointer', userSelect: 'none' }}
    >
      <Icon
        name={collapsed[id] ? 'chevron-right' : 'chevron-down'}
        size={11}
        strokeWidth={2}
        style={{ color: 'var(--text-muted)', flex: 'none' }}
      />
      <span className="section-label">{label}</span>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
}

function EmptyHint({ text }: { text: string }) {
  return <div style={{ padding: '2px 8px 4px', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{text}</div>
}
