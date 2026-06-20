import React from 'react'
import { ProgressBar } from '../components/data/ProgressBar'
import { StatusBadge } from '../components/data/StatusBadge'
import type { Torrent } from '../api/types'
import * as F from '../utils/format'
import { useResizableCols } from '../utils/useResizableCols'

interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

interface TorrentTableProps {
  torrents: Torrent[]
  selected: number[]
  onSelect: (id: number, e: React.MouseEvent) => void
  onDoubleClick: (t: Torrent) => void
  onContext: (t: Torrent, e: React.MouseEvent) => void
  sort: SortState
  onSort: (key: string) => void
}

interface ColDef {
  key: string
  label: string
  defaultW: number
  align: 'left' | 'right'
  minW: number
}

const COLS: ColDef[] = [
  { key: 'name',           label: 'Name',     defaultW: 280, align: 'left',  minW: 100 },
  { key: 'percentDone',    label: 'Progress', defaultW: 150, align: 'left',  minW: 80  },
  { key: 'totalSize',      label: 'Size',     defaultW: 78,  align: 'right', minW: 50  },
  { key: 'downloadedEver', label: 'Done',     defaultW: 78,  align: 'right', minW: 50  },
  { key: 'rateDownload',   label: '↓',        defaultW: 76,  align: 'right', minW: 50  },
  { key: 'rateUpload',     label: '↑',        defaultW: 76,  align: 'right', minW: 50  },
  { key: 'leftUntilDone',  label: 'Left',     defaultW: 78,  align: 'right', minW: 50  },
  { key: 'peers',          label: 'S/P',      defaultW: 60,  align: 'right', minW: 42  },
  { key: 'eta',            label: 'ETA',      defaultW: 66,  align: 'right', minW: 42  },
  { key: 'uploadRatio',    label: 'Ratio',    defaultW: 56,  align: 'right', minW: 42  },
  { key: 'addedDate',      label: 'Added',    defaultW: 104, align: 'right', minW: 60  },
  { key: 'doneDate',       label: 'Finished', defaultW: 104, align: 'right', minW: 60  },
  { key: 'status',         label: 'Status',   defaultW: 104, align: 'left',  minW: 60  },
]


function cell(t: Torrent, key: string): React.ReactNode {
  switch (key) {
    case 'name':
      return <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
    case 'percentDone':
      return <ProgressBar value={t.percentDone} status={t.status} showLabel striped={t.status === 'checking'} />
    case 'totalSize':       return num(F.size(t.totalSize))
    case 'downloadedEver':  return num(F.size(t.downloadedEver))
    case 'rateDownload':    return num(F.rate(t.rateDownload), t.rateDownload ? 'var(--status-download)' : undefined)
    case 'rateUpload':      return num(F.rate(t.rateUpload), t.rateUpload ? 'var(--status-seed)' : undefined)
    case 'leftUntilDone':   return num(t.leftUntilDone ? F.size(t.leftUntilDone) : '—')
    case 'peers':           return num(`${t.seedsConnected}/${t.peersConnected}`)
    case 'eta':             return num(F.eta(t.eta))
    case 'uploadRatio':     return num(t.uploadRatio.toFixed(2))
    case 'addedDate':       return num(F.date(t.addedDate))
    case 'doneDate':        return num(t.doneDate > 0 ? F.date(t.doneDate) : '—')
    case 'status':          return <StatusBadge status={t.status} />
    default:                return null
  }
}

function num(text: string, color?: string) {
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums slashed-zero', fontSize: 'var(--fs-xs)', color: color ?? 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

export function TorrentTable({ torrents, selected, onSelect, onDoubleClick, onContext, sort, onSort }: TorrentTableProps) {
  const { template, startResize, autoFit } = useResizableCols(
    COLS.map(c => c.defaultW),
    'transmission-col-widths',
    COLS.map(c => c.minW),
  )
  const containerRef = React.useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'var(--surface)' }}>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: template,
          position: 'sticky',
          top: 0,
          zIndex: 2,
          height: 'var(--header-h)',
          background: 'var(--grad-chrome)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {COLS.map((c, ci) => {
          const on = sort.key === c.key
          return (
            <div
              key={c.key}
              onClick={() => onSort(c.key)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                padding: '0 16px 0 8px',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: 'var(--fs-2xs)',
                fontWeight: 600,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                color: on ? 'var(--text)' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {c.label}
              {on && <span style={{ fontSize: 8 }}>{sort.dir === 'asc' ? '▲' : '▼'}</span>}

              {/* Resize handle — drag to resize, double-click to auto-fit */}
              <div
                onMouseDown={e => startResize(e, ci)}
                onDoubleClick={e => autoFit(e, ci, containerRef.current)}
                onClick={e => e.stopPropagation()}
                title="Drag to resize · Double-click to auto-fit"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  width: 6,
                  height: '100%',
                  cursor: 'col-resize',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ width: 1, height: '60%', background: 'var(--border-faint)' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Rows */}
      {torrents.map((t, i) => (
        <TorrentRow
          key={t.id}
          torrent={t}
          index={i}
          selected={selected.includes(t.id)}
          template={template}
          onSelect={onSelect}
          onDoubleClick={onDoubleClick}
          onContext={onContext}
        />
      ))}

      {torrents.length === 0 && (
        <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
          No torrents.
        </div>
      )}
    </div>
  )
}

interface RowProps {
  torrent: Torrent
  index: number
  selected: boolean
  template: string
  onSelect: (id: number, e: React.MouseEvent) => void
  onDoubleClick: (t: Torrent) => void
  onContext: (t: Torrent, e: React.MouseEvent) => void
}

function TorrentRow({ torrent, index, selected, template, onSelect, onDoubleClick, onContext }: RowProps) {
  const [hover, setHover] = React.useState(false)
  const bg = selected ? 'var(--row-selected)' : hover ? 'var(--row-hover)' : index % 2 ? 'var(--row-stripe)' : 'transparent'

  return (
    <div
      onClick={e => onSelect(torrent.id, e)}
      onDoubleClick={() => onDoubleClick(torrent)}
      onContextMenu={e => { e.preventDefault(); onContext(torrent, e) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: template,
        alignItems: 'center',
        height: 'var(--row-h)',
        cursor: 'default',
        userSelect: 'none',
        background: bg,
        borderBottom: '1px solid var(--border-faint)',
        fontSize: 'var(--fs-sm)',
        color: 'var(--text)',
      }}
    >
      {COLS.map((c, ci) => (
        <div
          key={c.key}
          data-col={ci}
          style={{
            padding: '0 8px',
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
            overflow: 'hidden',
          }}
        >
          {cell(torrent, c.key)}
        </div>
      ))}
    </div>
  )
}
