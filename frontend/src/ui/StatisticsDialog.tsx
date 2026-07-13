import { useEffect, useState } from 'react'
import { Dialog } from '../components/feedback/Dialog'
import * as rpc from '../api/rpc'
import * as F from '../utils/format'
import type { SessionStatsEntry } from '../api/types'

interface Props {
  onClose: () => void
}

export function StatisticsDialog({ onClose }: Props) {
  const [stats, setStats] = useState<SessionStatsEntry | null>(null)

  useEffect(() => {
    rpc.getSessionStats().then(s => setStats(s['cumulative-stats'])).catch(() => setStats(null))
  }, [])

  const ratio = stats && stats.downloadedBytes > 0
    ? (stats.uploadedBytes / stats.downloadedBytes).toFixed(2)
    : '—'

  return (
    <Dialog title="Statistics" width={360} onClose={onClose}>
      {!stats ? (
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 8, columnGap: 14, fontSize: 'var(--fs-md)' }}>
          <Row label="Downloaded" value={F.size(stats.downloadedBytes)} />
          <Row label="Uploaded" value={F.size(stats.uploadedBytes)} />
          <Row label="Ratio" value={ratio} />
          <Row label="Running time" value={F.duration(stats.secondsActive)} />
          <Row label="Sessions" value={String(stats.sessionCount)} />
          <Row label="Torrents added" value={String(stats.filesAdded)} />
        </div>
      )}
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{value}</span>
    </>
  )
}
