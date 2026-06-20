import React, { useEffect } from 'react'
import { Icon } from '../controls/Icon'

interface DialogProps {
  open?: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
  style?: React.CSSProperties
}

export function Dialog({ open = true, title, onClose, children, footer, width = 460, style }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16,18,22,0.4)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 900,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width,
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-4)',
          boxShadow: 'var(--shadow-dialog)',
          overflow: 'hidden',
          fontFamily: 'var(--font-sans)',
          color: 'var(--text)',
          ...style,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', height: 38, padding: '0 8px 0 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-bg)' }}>
          <span style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)', flex: 1 }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, border: 'none', background: 'transparent', borderRadius: 'var(--r-2)', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <Icon name="x" size={15} />
          </button>
        </div>

        <div style={{ padding: 14, fontSize: 'var(--fs-md)' }}>{children}</div>

        {footer && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
