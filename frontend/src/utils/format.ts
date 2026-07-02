export function size(bytes: number | null | undefined): string {
  if (bytes == null) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return (i === 0 ? n : n.toFixed(n < 10 ? 2 : 1)) + ' ' + units[i]
}

export function rate(bps: number | null | undefined): string {
  if (!bps) return '—'
  return size(bps) + '/s'
}

export function eta(sec: number | null | undefined): string {
  if (sec == null || sec < 0) return '∞'
  if (sec === 0) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m ${s}s`
  return `${s}s`
}

export type DateFormat = 'locale' | 'iso' | 'eu' | 'us'

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'locale', label: 'Locale (Jul 2, 2026)' },
  { value: 'iso', label: 'ISO (2026-07-02)' },
  { value: 'eu', label: 'European (02.07.2026)' },
  { value: 'us', label: 'US (07/02/2026)' },
]

const DATE_FORMAT_KEY = 'transmission-date-format'

export function getDateFormat(): DateFormat {
  const v = localStorage.getItem(DATE_FORMAT_KEY)
  return v === 'iso' || v === 'eu' || v === 'us' ? v : 'locale'
}

export function setDateFormat(fmt: DateFormat): void {
  localStorage.setItem(DATE_FORMAT_KEY, fmt)
}

export function date(ts: number): string {
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  switch (getDateFormat()) {
    case 'iso':
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
    case 'eu':
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${time}`
    case 'us':
      return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${time}`
    default:
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + time
  }
}

/** Human-readable duration, e.g. "92d 13h" or "5h 20m". */
export function duration(sec: number): string {
  if (sec <= 0) return '—'
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}
