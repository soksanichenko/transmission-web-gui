import React, { useState } from 'react'
import { Icon } from './Icon'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export function Checkbox({ checked = false, label, disabled = false, style, ...rest }: CheckboxProps) {
  const [hover, setHover] = useState(false)

  return (
    <label
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-sm)',
        color: 'var(--text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        userSelect: 'none',
        ...(style as React.CSSProperties),
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        {...rest}
      />
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 15,
          height: 15,
          flex: 'none',
          background: checked ? 'var(--accent-500)' : 'var(--surface)',
          border: `1px solid ${checked ? 'var(--accent-600)' : hover ? 'var(--border-strong)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--r-1)',
          boxShadow: 'var(--inset-1)',
          transition: 'background var(--t-fast), border-color var(--t-fast)',
        }}
      >
        {checked && <Icon name="check" size={11} strokeWidth={3} style={{ color: 'var(--text-on-accent)' }} />}
      </span>
      {label != null && <span>{label}</span>}
    </label>
  )
}
