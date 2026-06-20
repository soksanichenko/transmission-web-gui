import React, { useState } from 'react'
import { Dialog } from '../components/feedback/Dialog'
import { Button } from '../components/controls/Button'
import { Input } from '../components/controls/Input'
import { Checkbox } from '../components/controls/Checkbox'
import type { SessionInfo } from '../api/types'
import { getConnectionConfig, getServerConfig, saveServerConfig, setConnectionConfig } from '../api/config'

interface SettingsDialogProps {
  session: SessionInfo | null
  onClose: () => void
  onSave: (patch: Partial<SessionInfo>) => void
}

export function SettingsDialog({ session, onClose, onSave }: SettingsDialogProps) {
  const savedConn = getConnectionConfig()
  const fromServer = getServerConfig()
  const [conn, setConn] = useState(savedConn)
  const setConnField = (k: keyof typeof conn, v: string) => setConn(p => ({ ...p, [k]: v }))
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  const [s, setS] = useState({
    dlLimited: session?.['speed-limit-down-enabled'] ?? true,
    dlLimit: String(session?.['speed-limit-down'] ?? 2000),
    ulLimited: session?.['speed-limit-up-enabled'] ?? true,
    ulLimit: String(session?.['speed-limit-up'] ?? 500),
    altEnabled: session?.['alt-speed-enabled'] ?? false,
    altDl: String(session?.['alt-speed-down'] ?? 400),
    altUl: String(session?.['alt-speed-up'] ?? 100),
    port: String(session?.['peer-port'] ?? 51413),
    ratioLimited: session?.seedRatioLimited ?? true,
    ratioLimit: String(session?.seedRatioLimit ?? 2.0),
    maxDown: String(session?.['download-queue-size'] ?? 5),
    maxSeed: String(session?.['seed-queue-size'] ?? 10),
  })

  const set = (k: keyof typeof s, v: string | boolean) => setS(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    setSaving(true)
    setSaveErr(null)
    setConnectionConfig(conn)
    saveServerConfig(conn)
      .catch(err => setSaveErr(String(err)))
      .finally(() => setSaving(false))
    onSave({
      'speed-limit-down-enabled': s.dlLimited,
      'speed-limit-down': Number(s.dlLimit),
      'speed-limit-up-enabled': s.ulLimited,
      'speed-limit-up': Number(s.ulLimit),
      'alt-speed-enabled': s.altEnabled,
      'alt-speed-down': Number(s.altDl),
      'alt-speed-up': Number(s.altUl),
      'peer-port': Number(s.port),
      seedRatioLimited: s.ratioLimited,
      seedRatioLimit: Number(s.ratioLimit),
      'download-queue-size': Number(s.maxDown),
      'seed-queue-size': Number(s.maxSeed),
    })
    onClose()
  }

  return (
    <Dialog
      title="Preferences"
      width={500}
      onClose={onClose}
      footer={
        <>
          {saveErr && (
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--status-error)', flex: 1 }}>
              {saveErr}
            </span>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Group label="Connection">
          {Object.keys(fromServer).length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--status-seed)' }}>
                Defaults loaded from config.json
              </span>
              <button
                type="button"
                onClick={() => setConn({ ...savedConn, ...fromServer })}
                style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent-500)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Reset to server defaults
              </button>
            </div>
          )}
          <MiniNum label="RPC URL" value={conn.url} onValue={v => setConnField('url', v)} wide />
          <div style={{ display: 'flex', gap: 16 }}>
            <MiniNum label="Username" value={conn.username} onValue={v => setConnField('username', v)} />
            <MiniNum label="Password" value={conn.password} onValue={v => setConnField('password', v)} password />
          </div>
        </Group>

        <Group label="Speed">
          <LimitRow checked={s.dlLimited} onCheck={v => set('dlLimited', v)} label="Download rate" value={s.dlLimit} onValue={v => set('dlLimit', v)} unit="KB/s" />
          <LimitRow checked={s.ulLimited} onCheck={v => set('ulLimited', v)} label="Upload rate"   value={s.ulLimit} onValue={v => set('ulLimit', v)} unit="KB/s" />
        </Group>

        <Group label="Alternative limits (turtle)">
          <Checkbox label="Enable alternative speed limits" checked={s.altEnabled} onChange={e => set('altEnabled', e.target.checked)} />
          <div style={{ display: 'flex', gap: 16, opacity: s.altEnabled ? 1 : 0.5, pointerEvents: s.altEnabled ? 'auto' : 'none' }}>
            <MiniNum label="Down" value={s.altDl} onValue={v => set('altDl', v)} unit="KB/s" />
            <MiniNum label="Up"   value={s.altUl} onValue={v => set('altUl', v)} unit="KB/s" />
          </div>
        </Group>

        <Group label="Network">
          <MiniNum label="Peer port" value={s.port} onValue={v => set('port', v)} />
        </Group>

        <Group label="Seeding">
          <LimitRow checked={s.ratioLimited} onCheck={v => set('ratioLimited', v)} label="Stop seeding at ratio" value={s.ratioLimit} onValue={v => set('ratioLimit', v)} unit="" />
        </Group>

        <Group label="Queue">
          <div style={{ display: 'flex', gap: 16 }}>
            <MiniNum label="Max active downloads" value={s.maxDown} onValue={v => set('maxDown', v)} />
            <MiniNum label="Max active seeds"     value={s.maxSeed} onValue={v => set('maxSeed', v)} />
          </div>
        </Group>
      </div>
    </Dialog>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="section-label" style={{ borderBottom: '1px solid var(--border-faint)', paddingBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

function LimitRow({ checked, onCheck, label, value, onValue, unit }: { checked: boolean; onCheck: (v: boolean) => void; label: string; value: string; onValue: (v: string) => void; unit: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1 }}>
        <Checkbox label={label} checked={checked} onChange={e => onCheck(e.target.checked)} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: checked ? 1 : 0.5, pointerEvents: checked ? 'auto' : 'none' }}>
        <Input mono value={value} onChange={e => onValue(e.target.value)} containerStyle={{ width: 76 }} />
        {unit && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', width: 36 }}>{unit}</span>}
      </div>
    </div>
  )
}

function MiniNum({ label, value, onValue, unit, wide, password }: { label: string; value: string; onValue: (v: string) => void; unit?: string; wide?: boolean; password?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: wide ? 1 : undefined }}>
      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Input
          mono={!wide}
          type={password ? 'password' : 'text'}
          value={value}
          onChange={e => onValue(e.target.value)}
          containerStyle={wide ? { width: '100%' } : { width: 84 }}
        />
        {unit && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
    </label>
  )
}
