import React, { useState } from 'react'
import { Icon } from './Icon'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: string
  mono?: boolean
  size?: 'md' | 'sm'
  containerStyle?: React.CSSProperties
}

export function Input({
  icon,
  mono = false,
  size = 'md',
  disabled = false,
  style,
  containerStyle,
  ...rest
}: InputProps) {
  const [focus, setFocus] = useState(false)
  const h = size === 'sm' ? 'var(--control-h-sm)' : 'var(--control-h)'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: h,
        padding: icon ? '0 8px 0 7px' : '0 8px',
        background: 'var(--surface)',
        border: `1px solid ${focus ? 'var(--focus-ring)' : 'var(--border-strong)'}`,
        borderRadius: 'var(--r-2)',
        boxShadow: focus ? '0 0 0 2px color-mix(in srgb, var(--focus-ring) 25%, transparent)' : 'var(--inset-1)',
        opacity: disabled ? 0.55 : 1,
        transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
        ...containerStyle,
      }}
    >
      {icon && <Icon name={icon} size={14} style={{ color: 'var(--text-muted)' }} />}
      <input
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text)',
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
          fontSize: 'var(--fs-sm)',
          fontVariantNumeric: mono ? 'tabular-nums slashed-zero' : 'normal',
          ...style,
        }}
        {...rest}
      />
    </div>
  )
}
