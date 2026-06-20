import React, { useState } from 'react'
import { Icon } from './Icon'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options?: (SelectOption | string)[]
  size?: 'md' | 'sm'
  containerStyle?: React.CSSProperties
}

export function Select({
  options = [],
  size = 'md',
  disabled = false,
  style,
  containerStyle,
  ...rest
}: SelectProps) {
  const [focus, setFocus] = useState(false)
  const h = size === 'sm' ? 'var(--control-h-sm)' : 'var(--control-h)'
  const opts = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o))

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        height: h,
        background: 'var(--surface)',
        border: `1px solid ${focus ? 'var(--focus-ring)' : 'var(--border-strong)'}`,
        borderRadius: 'var(--r-2)',
        boxShadow: focus ? '0 0 0 2px color-mix(in srgb, var(--focus-ring) 25%, transparent)' : 'none',
        opacity: disabled ? 0.55 : 1,
        transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
        ...containerStyle,
      }}
    >
      <select
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--fs-sm)',
          height: '100%',
          padding: '0 24px 0 8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          width: '100%',
          ...style,
        }}
        {...rest}
      >
        {opts.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <Icon name="chevron-down" size={13} style={{ position: 'absolute', right: 6, color: 'var(--text-muted)', pointerEvents: 'none' }} />
    </div>
  )
}
