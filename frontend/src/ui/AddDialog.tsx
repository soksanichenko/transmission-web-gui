import React, { useRef, useState } from 'react'
import { Dialog } from '../components/feedback/Dialog'
import { Button } from '../components/controls/Button'
import { Input } from '../components/controls/Input'
import { Select } from '../components/controls/Select'
import { Checkbox } from '../components/controls/Checkbox'
import { Icon } from '../components/controls/Icon'

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
          <Select value={dir} onChange={e => setDir(e.target.value)} options={dirs} containerStyle={{ width: '100%' }} />
        </Field>

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
