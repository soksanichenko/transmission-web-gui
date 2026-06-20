import React from 'react'
import type { TorrentStatus } from '../../api/types'

const MAP: Record<TorrentStatus, { label: string; color: string; bg: string }> = {
  downloading: { label: 'Downloading', color: 'var(--status-download)', bg: 'var(--status-download-bg)' },
  seeding:     { label: 'Seeding',     color: 'var(--status-seed)',     bg: 'var(--status-seed-bg)' },
  paused:      { label: 'Paused',      color: 'var(--status-paused)',   bg: 'var(--status-paused-bg)' },
  checking:    { label: 'Checking',    color: 'var(--status-check)',    bg: 'var(--status-check-bg)' },
  error:       { label: 'Error',       color: 'var(--status-error)',    bg: 'var(--status-error-bg)' },
  queued:      { label: 'Queued',      color: 'var(--status-queued)',   bg: 'var(--status-queued-bg)' },
}

interface StatusBadgeProps {
  status: TorrentStatus
  variant?: 'text' | 'soft'
  label?: string
  style?: React.CSSProperties
}

export function StatusBadge({ status, variant = 'text', label, style }: StatusBadgeProps) {
  const s = MAP[status]
  const text = label ?? s.label

  if (variant === 'soft') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 17,
          padding: '0 7px',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--fs-2xs)',
          fontWeight: 'var(--fw-semibold)',
          letterSpacing: '0.02em',
          color: s.color,
          background: s.bg,
          borderRadius: 'var(--r-pill)',
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
        {text}
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-sm)',
        color: s.color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flex: 'none' }} />
      {text}
    </span>
  )
}
