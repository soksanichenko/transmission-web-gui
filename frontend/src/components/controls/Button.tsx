import React, { useState } from 'react'
import { Icon } from './Icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  icon?: string
  caret?: boolean
  active?: boolean
}

export function Button({
  children,
  variant = 'default',
  size = 'md',
  icon,
  caret = false,
  disabled = false,
  active = false,
  style,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)

  const h = size === 'sm' ? 'var(--control-h-sm)' : 'var(--control-h)'
  const pad = size === 'sm' ? '0 8px' : '0 10px'

  const variantStyle: React.CSSProperties =
    variant === 'primary'
      ? { background: 'var(--accent-500)', borderColor: 'var(--accent-600)', color: 'var(--text-on-accent)' }
      : variant === 'ghost'
      ? { background: active ? 'var(--row-selected)' : 'transparent', borderColor: 'transparent' }
      : variant === 'danger'
      ? { background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--status-error)' }
      : { background: 'var(--surface)', borderColor: 'var(--border-strong)' }

  const hoverStyle: React.CSSProperties =
    hover && !disabled
      ? variant === 'primary'
        ? { background: 'var(--accent-600)' }
        : variant === 'ghost'
        ? { background: 'var(--row-hover)' }
        : { background: 'var(--surface-alt)' }
      : {}

  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false) }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: h,
        padding: pad,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-sm)',
        fontWeight: 'var(--fw-medium)',
        lineHeight: 1,
        color: 'var(--text)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--r-2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        transition: 'background var(--t-fast), border-color var(--t-fast)',
        transform: press && !disabled ? 'translateY(0.5px)' : 'none',
        ...variantStyle,
        ...hoverStyle,
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 15} />}
      {children}
      {caret && <Icon name="chevron-down" size={13} style={{ marginLeft: 1, marginRight: -2, opacity: 0.8 }} />}
    </button>
  )
}
