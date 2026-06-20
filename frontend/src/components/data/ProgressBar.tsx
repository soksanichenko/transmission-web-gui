import React from 'react'
import type { TorrentStatus } from '../../api/types'

const STATUS_FILL: Record<TorrentStatus, string> = {
  downloading: 'var(--fill-download)',
  seeding: 'var(--fill-seed)',
  paused: 'var(--fill-paused)',
  checking: 'var(--fill-check)',
  error: 'var(--fill-error)',
  queued: 'var(--status-queued)',
}

interface ProgressBarProps {
  value: number
  status?: TorrentStatus
  /** Render % centered over the bar instead of to the right */
  showLabel?: boolean
  height?: number | string
  striped?: boolean
  style?: React.CSSProperties
}

export function ProgressBar({ value = 0, status = 'downloading', showLabel = false, height, striped = false, style }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const fill = STATUS_FILL[status]
  const pctStr = pct.toFixed(pct < 100 && pct > 0 ? 1 : 0) + '%'

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        height: height ?? 'var(--bar-h)',
        background: 'var(--track)',
        borderRadius: 'var(--bar-r)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Fill */}
      <div
        style={{
          height: '100%',
          width: pct + '%',
          background: fill,
          borderRadius: 'var(--bar-r)',
          backgroundImage: striped
            ? 'linear-gradient(45deg, rgba(255,255,255,.18) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.18) 50%, rgba(255,255,255,.18) 75%, transparent 75%)'
            : 'none',
          backgroundSize: striped ? '10px 10px' : 'auto',
          transition: 'width var(--t-base)',
        }}
      />

      {/* Centered label — sits above the fill via absolute positioning */}
      {showLabel && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'var(--fs-xs)',
            fontWeight: 600,
            /* Switch text color when bar covers more than half so it stays readable */
            color: pct >= 50 ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {pctStr}
        </span>
      )}
    </div>
  )
}
