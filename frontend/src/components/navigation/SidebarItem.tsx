import React, { useState } from 'react'
import { Icon } from '../controls/Icon'

interface SidebarItemProps {
  label: string
  count?: number
  icon?: string
  dotColor?: string
  active?: boolean
  indent?: boolean
  mono?: boolean
  onClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  style?: React.CSSProperties
}

export function SidebarItem({ label, count, icon, dotColor, active = false, indent = false, mono = false, onClick, onContextMenu, style }: SidebarItemProps) {
  const [hover, setHover] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        width: '100%',
        height: 24,
        padding: indent ? '0 8px 0 22px' : '0 8px',
        border: 'none',
        borderRadius: 'var(--r-2)',
        background: active ? 'var(--row-selected)' : hover ? 'var(--row-hover)' : 'transparent',
        color: active ? 'var(--row-selected-text)' : 'var(--text)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontSize: 'var(--fs-sm)',
        fontWeight: active ? 'var(--fw-medium)' : 'var(--fw-regular)',
        transition: 'background var(--t-fast)',
        ...style,
      }}
    >
      {dotColor && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flex: 'none' }} />}
      {icon && <Icon name={icon} size={14} style={{ color: 'var(--text-secondary)', flex: 'none' }} />}
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {count != null && (
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 'var(--fs-xs)', color: active ? 'var(--row-selected-text)' : 'var(--text-muted)', flex: 'none' }}>
          {count}
        </span>
      )}
    </button>
  )
}
