import React, { useState } from 'react'
import { Icon } from './Icon'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string
  size?: number
  iconSize?: number
  variant?: 'ghost' | 'solid'
  active?: boolean
}

export function IconButton({
  icon,
  size = 26,
  iconSize,
  variant = 'ghost',
  active = false,
  disabled = false,
  title,
  style,
  ...rest
}: IconButtonProps) {
  const [hover, setHover] = useState(false)

  const bg = active
    ? 'var(--row-selected)'
    : hover && !disabled
    ? 'var(--row-hover)'
    : variant === 'solid'
    ? 'var(--surface)'
    : 'transparent'

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        padding: 0,
        color: 'var(--text-secondary)',
        background: bg,
        border: variant === 'solid' ? '1px solid var(--border-strong)' : '1px solid transparent',
        borderRadius: 'var(--r-2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background var(--t-fast)',
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={iconSize ?? Math.round(size * 0.6)} />
    </button>
  )
}
