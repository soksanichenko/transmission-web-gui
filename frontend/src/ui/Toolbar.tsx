import { Button } from '../components/controls/Button'
import { IconButton } from '../components/controls/IconButton'
import { Input } from '../components/controls/Input'

interface ToolbarProps {
  selCount: number
  onAdd: () => void
  onSettings: () => void
  onStatistics: () => void
  onAction: (action: 'start' | 'pause' | 'delete') => void
  search: string
  onSearch: (v: string) => void
  altSpeed: boolean
  onToggleAlt: () => void
}

export function Toolbar({ selCount, onAdd, onSettings, onStatistics, onAction, search, onSearch, altSpeed, onToggleAlt }: ToolbarProps) {
  const has = selCount > 0
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 'var(--toolbar-h)',
        padding: '0 8px',
        background: 'var(--grad-chrome)',
        borderBottom: '1px solid var(--border)',
        flex: 'none',
      }}
    >
      <Button variant="primary" icon="plus" caret onClick={onAdd}>Add</Button>

      <Divider />

      <Button variant="ghost" icon="play" disabled={!has} onClick={() => onAction('start')}>Start</Button>
      <Button variant="ghost" icon="pause" disabled={!has} onClick={() => onAction('pause')}>Pause</Button>
      <Button variant="ghost" icon="trash-2" disabled={!has} onClick={() => onAction('delete')}>Delete</Button>

      <Divider />

      <IconButton icon="turtle" title="Alternative speed limits" active={altSpeed} onClick={onToggleAlt} />

      <div style={{ flex: 1 }} />

      <Input
        icon="search"
        placeholder="Search"
        value={search}
        onChange={e => onSearch(e.target.value)}
        size="sm"
        containerStyle={{ width: 168 }}
      />
      <IconButton icon="activity" title="Statistics" onClick={onStatistics} />
      <IconButton icon="settings" title="Preferences" onClick={onSettings} />
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 3px', flex: 'none' }} />
}
