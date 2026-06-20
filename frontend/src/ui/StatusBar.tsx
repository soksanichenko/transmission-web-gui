import type { Torrent } from '../api/types'
import * as F from '../utils/format'

interface StatusBarProps {
  torrents: Torrent[]
  altSpeed: boolean
  version: string
  freeSpace?: number
}

export function StatusBar({ torrents, altSpeed, version, freeSpace }: StatusBarProps) {
  const down = torrents.reduce((s, t) => s + t.rateDownload, 0)
  const up = torrents.reduce((s, t) => s + t.rateUpload, 0)
  const active = torrents.filter(t => t.status === 'downloading').length
  const seeding = torrents.filter(t => t.status === 'seeding').length

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        height: 'var(--statusbar-h)',
        padding: '0 12px',
        flex: 'none',
        background: 'var(--grad-chrome)',
        borderTop: '1px solid var(--border)',
        fontSize: 'var(--fs-xs)',
        color: 'var(--text-secondary)',
      }}
    >
      <SpeedStat arrow="↓" color="var(--status-download)" value={F.rate(down)} />
      <SpeedStat arrow="↑" color="var(--status-seed)" value={F.rate(up)} />

      {altSpeed && (
        <span style={{ color: 'var(--status-check)', fontWeight: 600 }}>Alt limits on</span>
      )}

      <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
      <CountStat label="Active" value={active} />
      <CountStat label="Seeding" value={seeding} />
      <CountStat label="Total" value={torrents.length} />

      {freeSpace != null && freeSpace >= 0 && (
        <>
          <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
          <span>
            Free:{' '}
            <b style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--text)', fontWeight: 600 }}>
              {F.size(freeSpace)}
            </b>
          </span>
        </>
      )}

      <div style={{ flex: 1 }} />
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)' }}>
        {version ? `transmission ${version}` : 'transmission'} · refresh 3s
      </span>
    </div>
  )
}

function SpeedStat({ arrow, color, value }: { arrow: string; color: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{arrow}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums slashed-zero', color: 'var(--text)', fontWeight: 600 }}>{value}</span>
    </span>
  )
}

function CountStat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      {label}:{' '}
      <b style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--text)', fontWeight: 600 }}>
        {value}
      </b>
    </span>
  )
}
