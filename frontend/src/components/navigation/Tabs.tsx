import React, { useState } from 'react'
import { Icon } from '../controls/Icon'

interface Tab {
  id: string
  label: string
  icon?: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  value: string
  onChange: (id: string) => void
  style?: React.CSSProperties
}

export function Tabs({ tabs, value, onChange, style }: TabsProps) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 1,
        height: 28,
        background: 'var(--chrome-bg)',
        borderBottom: '1px solid var(--border)',
        padding: '0 4px',
        ...style,
      }}
    >
      {tabs.map(t => (
        <TabButton key={t.id} tab={t} active={t.id === value} onClick={() => onChange(t.id)} />
      ))}
    </div>
  )
}

function TabButton({ tab, active, onClick }: { tab: Tab; active: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: '100%',
        padding: '0 11px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-sm)',
        fontWeight: active ? 'var(--fw-semibold)' : 'var(--fw-regular)',
        color: active ? 'var(--text)' : hover ? 'var(--text)' : 'var(--text-secondary)',
        boxShadow: active ? 'inset 0 -2px 0 var(--accent-500)' : 'none',
        transition: 'color var(--t-fast)',
      }}
    >
      {tab.icon && <Icon name={tab.icon} size={14} />}
      {tab.label}
      {tab.count != null && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>
          {tab.count}
        </span>
      )}
    </button>
  )
}
