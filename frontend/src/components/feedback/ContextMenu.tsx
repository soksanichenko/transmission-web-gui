import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '../controls/Icon'

export interface MenuItem {
  label?: string
  icon?: string
  danger?: boolean
  disabled?: boolean
  shortcut?: string
  onClick?: () => void
  separator?: boolean
  header?: string
  submenu?: MenuItem[]
}

interface ContextMenuProps {
  items: MenuItem[]
  x: number
  y: number
  onClose: () => void
  style?: React.CSSProperties
}

export function ContextMenu({ items, x, y, onClose, style }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [openSub, setOpenSub] = useState<number | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        position: 'fixed',
        top: y,
        left: x,
        minWidth: 200,
        padding: 4,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-3)',
        boxShadow: 'var(--shadow-popover)',
        zIndex: 1000,
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
    >
      {items.map((it, i) => {
        if (it.separator) return <div key={i} style={{ height: 1, background: 'var(--border-faint)', margin: '4px 2px' }} />
        if (it.header)    return <div key={i} style={{ padding: '5px 8px 3px', fontSize: 'var(--fs-2xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>{it.header}</div>

        const isSubOpen = openSub === i

        return (
          <React.Fragment key={i}>
            <MenuItemButton
              item={it}
              onClose={it.submenu ? undefined : onClose}
              onSubmenuToggle={it.submenu ? () => setOpenSub(isSubOpen ? null : i) : undefined}
              isSubmenuOpen={isSubOpen}
            />
            {it.submenu && isSubOpen && it.submenu.map((sub, j) => (
              <MenuItemButton key={j} item={sub} onClose={onClose} indent />
            ))}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function MenuItemButton({
  item, onClose, onSubmenuToggle, isSubmenuOpen, indent,
}: {
  item: MenuItem
  onClose?: () => void
  onSubmenuToggle?: () => void
  isSubmenuOpen?: boolean
  indent?: boolean
}) {
  const [hover, setHover] = useState(false)
  const disabled = item.disabled ?? false

  const handleClick = () => {
    if (disabled) return
    if (onSubmenuToggle) {
      onSubmenuToggle()
    } else {
      item.onClick?.()
      onClose?.()
    }
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        width: '100%',
        height: 26,
        paddingLeft: indent ? 28 : 8,
        paddingRight: 8,
        border: 'none',
        borderRadius: 'var(--r-2)',
        background: hover && !disabled ? (item.danger ? 'var(--status-error-bg)' : 'var(--row-hover)') : 'transparent',
        color: disabled ? 'var(--text-muted)' : item.danger ? 'var(--status-error)' : 'var(--text)',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-sm)',
        textAlign: 'left',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <span style={{ width: 15, flex: 'none', display: 'inline-flex' }}>
        {item.icon && <Icon name={item.icon} size={14} />}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.shortcut && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>
          {item.shortcut}
        </span>
      )}
      {item.submenu && (
        <Icon name={isSubmenuOpen ? 'chevron-down' : 'chevron-right'} size={12} style={{ color: 'var(--text-muted)', marginLeft: 2 }} />
      )}
    </button>
  )
}
