import React, { useRef, useState } from 'react'
import { Dialog } from '../components/feedback/Dialog'
import { Button } from '../components/controls/Button'
import { Input } from '../components/controls/Input'
import { Checkbox } from '../components/controls/Checkbox'
import { Icon } from '../components/controls/Icon'
import { ContextMenu } from '../components/feedback/ContextMenu'

interface AddDialogProps {
  dirs: string[]
  onClose: () => void
  onAdd: (params: { magnetOrFile: string; isFile: boolean; dir: string; paused: boolean }) => void
}

export function AddDialog({ dirs, onClose, onAdd }: AddDialogProps) {
  const [magnet, setMagnet] = useState('')
  const [dir, setDir] = useState(dirs[0] ?? '/downloads')
  const [paused, setPaused] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileData, setFileData] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [dirMenuPos, setDirMenuPos] = useState<{ x: number; y: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const readFile = (f: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const b64 = (e.target?.result as string).split(',')[1] ?? ''
      setFileData(b64)
      setFileName(f.name)
    }
    reader.readAsDataURL(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) readFile(f)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) readFile(f)
  }

  const canAdd = !!magnet || !!fileData

  const handleAdd = () => {
    if (fileData) {
      onAdd({ magnetOrFile: fileData, isFile: true, dir, paused })
    } else if (magnet) {
      onAdd({ magnetOrFile: magnet, isFile: false, dir, paused })
    }
  }

  return (
    <Dialog
      title="Add Torrent"
      width={440}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!canAdd} onClick={handleAdd}>Add</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '20px 12px',
            textAlign: 'center',
            cursor: 'pointer',
            border: `1.5px dashed ${drag ? 'var(--accent-500)' : 'var(--border-strong)'}`,
            borderRadius: 'var(--r-3)',
            background: drag ? 'var(--row-hover)' : 'var(--surface-sunken)',
            color: 'var(--text-secondary)',
          }}
        >
          <Icon name="upload" size={20} style={{ color: drag ? 'var(--accent-500)' : 'var(--text-muted)' }} />
          {fileName
            ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>{fileName}</span>
            : <span style={{ fontSize: 'var(--fs-sm)' }}>Drop a <b>.torrent</b> file here, or click to choose</span>}
        </div>
        <input ref={fileRef} type="file" accept=".torrent" style={{ display: 'none' }} onChange={handleFileInput} />

        <Field label="Magnet link">
          <Input placeholder="magnet:?xt=urn:btih:…" value={magnet} onChange={e => setMagnet(e.target.value)} containerStyle={{ width: '100%' }} />
        </Field>

        <Field label="Download folder">
          <div style={{ display: 'flex', gap: 6 }}>
            <Input
              mono
              list="add-dialog-dirs"
              value={dir}
              onChange={e => setDir(e.target.value)}
              containerStyle={{ flex: 1 }}
            />
            <datalist id="add-dialog-dirs">
              {dirs.map(d => <option key={d} value={d} />)}
            </datalist>
            <Button
              onClick={e => {
                const r = e.currentTarget.getBoundingClientRect()
                setDirMenuPos({ x: r.right, y: r.bottom + 4 })
              }}
            >
              <Icon name="chevron-down" size={13} />
            </Button>
          </div>
        </Field>
        {dirMenuPos && (
          <ContextMenu
            x={dirMenuPos.x}
            y={dirMenuPos.y}
            style={{ transform: 'translateX(-100%)' }}
            items={
              dirs.length > 0
                ? dirs.map(d => ({ label: d, onClick: () => setDir(d) }))
                : [{ label: 'No known folders yet', disabled: true }]
            }
            onClose={() => setDirMenuPos(null)}
          />
        )}

        <Checkbox label="Add paused" checked={paused} onChange={e => setPaused(e.target.checked)} />
      </div>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  )
}
