import { useState, useEffect } from 'react'
import type { Torrent } from '../api/types'
import * as F from '../utils/format'

interface GraphTabProps {
  torrent: Torrent
}

interface Point { d: number; u: number }

const POINTS = 60

export function GraphTab({ torrent }: GraphTabProps) {
  const [hist, setHist] = useState<Point[]>(() =>
    Array.from({ length: POINTS }, () => ({
      d: Math.max(0, torrent.rateDownload * (0.5 + Math.random())),
      u: Math.max(0, torrent.rateUpload * (0.5 + Math.random())),
    }))
  )

  useEffect(() => {
    const id = setInterval(() => {
      setHist(h => [
        ...h.slice(1),
        {
          d: Math.max(0, torrent.rateDownload * (0.5 + Math.random())),
          u: Math.max(0, torrent.rateUpload * (0.5 + Math.random())),
        },
      ])
    }, 1200)
    return () => clearInterval(id)
  }, [torrent.rateDownload, torrent.rateUpload])

  const W = 760, H = 150, PAD = 4
  const max = Math.max(1, ...hist.map(p => Math.max(p.d, p.u)))
  const x = (i: number) => PAD + (i / (hist.length - 1)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2 - 10)
  const path = (key: 'd' | 'u') =>
    hist.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[key]).toFixed(1)).join(' ')
  const area = (key: 'd' | 'u') =>
    path(key) + ` L ${x(hist.length - 1).toFixed(1)} ${H - PAD} L ${x(0).toFixed(1)} ${H - PAD} Z`
  const last = hist[hist.length - 1]!

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 'var(--fs-xs)' }}>
        <Legend color="var(--status-download)" label="Download" value={F.rate(last.d)} />
        <Legend color="var(--status-seed)" label="Upload" value={F.rate(last.u)} />
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)' }}>
          last 5 min · peak {F.rate(max)}
        </span>
      </div>
      <div style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--r-2)', background: 'var(--surface-sunken)', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
          {[0.25, 0.5, 0.75].map(g => (
            <line key={g} x1={PAD} x2={W - PAD} y1={PAD + g * (H - PAD * 2)} y2={PAD + g * (H - PAD * 2)} stroke="var(--border-faint)" strokeWidth="1" />
          ))}
          <path d={area('d')} fill="var(--status-download)" opacity="0.10" />
          <path d={area('u')} fill="var(--status-seed)" opacity="0.10" />
          <path d={path('d')} fill="none" stroke="var(--status-download)" strokeWidth="1.5" />
          <path d={path('u')} fill="none" stroke="var(--status-seed)" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 2, background: color, borderRadius: 1 }} />
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color, fontWeight: 600 }}>{value}</span>
    </span>
  )
}
