import React, { useEffect, useState } from 'react'
import { Dialog } from '../components/feedback/Dialog'
import { Button } from '../components/controls/Button'
import { Input } from '../components/controls/Input'
import { Checkbox } from '../components/controls/Checkbox'
import { Tabs } from '../components/navigation/Tabs'
import * as rpc from '../api/rpc'

interface Props {
  torrentId: number
  torrentName: string
  onClose: () => void
}

export function TorrentPropertiesDialog({ torrentId, torrentName, onClose }: Props) {
  const [tab, setTab] = useState('general')
  const [loading, setLoading] = useState(true)

  const [dlLimited, setDlLimited]   = useState(false)
  const [dlLimit, setDlLimit]       = useState('0')
  const [ulLimited, setUlLimited]   = useState(false)
  const [ulLimit, setUlLimit]       = useState('0')
  const [peerLimit, setPeerLimit]   = useState('0')
  const [ratioMode, setRatioMode]   = useState(0)
  const [ratioLimit, setRatioLimit] = useState('2.00')
  const [idleMode, setIdleMode]     = useState(0)
  const [idleLimit, setIdleLimit]   = useState('30')
  const [trackers, setTrackers]     = useState('')
  const [origTrackers, setOrigTrackers] = useState('')

  useEffect(() => {
    rpc.getTorrentProps(torrentId).then(p => {
      setDlLimited(p.downloadLimited)
      setDlLimit(String(p.downloadLimit))
      setUlLimited(p.uploadLimited)
      setUlLimit(String(p.uploadLimit))
      setPeerLimit(String(p.peerLimit))
      setRatioMode(p.seedRatioMode)
      setRatioLimit(p.seedRatioLimit.toFixed(2))
      setIdleMode(p.seedIdleMode)
      setIdleLimit(String(p.seedIdleLimit))
      const tl = p.trackers.map(t => t.announce).join('\n')
      setTrackers(tl)
      setOrigTrackers(tl)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [torrentId])

  const handleSave = async () => {
    const props: Parameters<typeof rpc.saveTorrentProps>[1] = {
      downloadLimited: dlLimited,
      downloadLimit: parseInt(dlLimit) || 0,
      uploadLimited: ulLimited,
      uploadLimit: parseInt(ulLimit) || 0,
      peerLimit: parseInt(peerLimit) || 0,
      seedRatioMode: ratioMode,
      seedRatioLimit: parseFloat(ratioLimit) || 0,
      seedIdleMode: idleMode,
      seedIdleLimit: parseInt(idleLimit) || 0,
    }
    if (trackers !== origTrackers) {
      props.trackerList = trackers.trim()
    }
    await rpc.saveTorrentProps(torrentId, props)
    onClose()
  }

  return (
    <Dialog
      title={`Properties — ${torrentName}`}
      width={480}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={loading} onClick={handleSave}>OK</Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'general',  label: 'General' },
          { id: 'trackers', label: 'Trackers' },
        ]}
      />

      {loading ? (
        <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>Loading…</div>
      ) : tab === 'general' ? (
        <GeneralTab
          dlLimited={dlLimited} onDlLimited={setDlLimited}
          dlLimit={dlLimit} onDlLimit={setDlLimit}
          ulLimited={ulLimited} onUlLimited={setUlLimited}
          ulLimit={ulLimit} onUlLimit={setUlLimit}
          peerLimit={peerLimit} onPeerLimit={setPeerLimit}
          ratioMode={ratioMode} onRatioMode={setRatioMode}
          ratioLimit={ratioLimit} onRatioLimit={setRatioLimit}
          idleMode={idleMode} onIdleMode={setIdleMode}
          idleLimit={idleLimit} onIdleLimit={setIdleLimit}
        />
      ) : (
        <TrackersTab value={trackers} onChange={setTrackers} />
      )}
    </Dialog>
  )
}

// ── General tab ───────────────────────────────────────────────────────────────

function GeneralTab({
  dlLimited, onDlLimited, dlLimit, onDlLimit,
  ulLimited, onUlLimited, ulLimit, onUlLimit,
  peerLimit, onPeerLimit,
  ratioMode, onRatioMode, ratioLimit, onRatioLimit,
  idleMode, onIdleMode, idleLimit, onIdleLimit,
}: {
  dlLimited: boolean; onDlLimited: (v: boolean) => void
  dlLimit: string;    onDlLimit: (v: string) => void
  ulLimited: boolean; onUlLimited: (v: boolean) => void
  ulLimit: string;    onUlLimit: (v: string) => void
  peerLimit: string;  onPeerLimit: (v: string) => void
  ratioMode: number;  onRatioMode: (v: number) => void
  ratioLimit: string; onRatioLimit: (v: string) => void
  idleMode: number;   onIdleMode: (v: number) => void
  idleLimit: string;  onIdleLimit: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '14px 0 2px' }}>

      <Section label="Speed">
        <LimitRow
          label="Download limit"
          enabled={dlLimited} onEnabled={onDlLimited}
          value={dlLimit} onChange={onDlLimit}
          unit="KB/s"
        />
        <LimitRow
          label="Upload limit"
          enabled={ulLimited} onEnabled={onUlLimited}
          value={ulLimit} onChange={onUlLimit}
          unit="KB/s"
        />
      </Section>

      <Section label="Connections">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 112, fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Peer limit</span>
          <Input
            value={peerLimit}
            onChange={e => onPeerLimit(e.target.value)}
            style={{ width: 72, textAlign: 'right' }}
            mono
          />
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>peers (0 = global)</span>
        </div>
      </Section>

      <Section label="Seeding">
        <ModeRow
          label="Ratio"
          mode={ratioMode} onMode={onRatioMode}
          value={ratioLimit} onChange={onRatioLimit}
          unit=""
          limitLabel="Stop at"
        />
        <ModeRow
          label="Idle"
          mode={idleMode} onMode={onIdleMode}
          value={idleLimit} onChange={onIdleLimit}
          unit="min"
          limitLabel="Stop after"
        />
      </Section>

    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

function LimitRow({ label, enabled, onEnabled, value, onChange, unit }: {
  label: string; enabled: boolean; onEnabled: (v: boolean) => void
  value: string; onChange: (v: string) => void; unit: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Checkbox checked={enabled} onChange={e => onEnabled(e.target.checked)} />
      <span style={{ width: 100, fontSize: 'var(--fs-sm)', color: enabled ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={!enabled}
        style={{ width: 72, textAlign: 'right' }}
        mono
      />
      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{unit}</span>
    </div>
  )
}

// mode: 0=global, 1=custom, 2=unlimited
function ModeRow({ label, mode, onMode, value, onChange, unit, limitLabel }: {
  label: string; mode: number; onMode: (v: number) => void
  value: string; onChange: (v: string) => void; unit: string; limitLabel: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ width: 36, fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>{label}</span>
      {([0, 1, 2] as const).map(m => (
        <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 'var(--fs-sm)' }}>
          <input
            type="radio"
            name={`${label}-mode`}
            checked={mode === m}
            onChange={() => onMode(m)}
            style={{ accentColor: 'var(--accent-500)', cursor: 'pointer' }}
          />
          {m === 0 ? 'Global' : m === 1 ? limitLabel : 'No limit'}
        </label>
      ))}
      {mode === 1 && (
        <>
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ width: 64, textAlign: 'right' }}
            mono
          />
          {unit && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{unit}</span>}
        </>
      )}
    </div>
  )
}

// ── Trackers tab ──────────────────────────────────────────────────────────────

function TrackersTab({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ padding: '14px 0 2px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
        One tracker per line. Blank line separates tiers. Changes applied on save.
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        style={{
          width: '100%',
          height: 220,
          resize: 'vertical',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-xs)',
          color: 'var(--text)',
          background: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-2)',
          padding: '8px 10px',
          outline: 'none',
          boxSizing: 'border-box',
          lineHeight: '1.6',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent-500)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )
}
