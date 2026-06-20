import { useCallback, useRef, useState } from 'react'

export function useResizableCols(defaults: number[], storageKey: string, minWidths?: number[]) {
  const load = (): number[] => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const p = JSON.parse(raw) as number[]
        if (Array.isArray(p) && p.length === defaults.length) return p
      }
    } catch {}
    return [...defaults]
  }

  const [widths, setWidths] = useState<number[]>(load)
  const dragging = useRef<{ idx: number; startX: number; startW: number } | null>(null)

  const save = (ws: number[]) => localStorage.setItem(storageKey, JSON.stringify(ws))

  const startResize = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    dragging.current = { idx, startX: e.clientX, startW: widths[idx]! }

    const move = (ev: MouseEvent) => {
      if (!dragging.current) return
      const { idx: i, startX, startW } = dragging.current
      const min = minWidths?.[i] ?? 40
      const newW = Math.max(min, startW + (ev.clientX - startX))
      setWidths(ws => { const n = [...ws]; n[i] = newW; return n })
    }

    const up = () => {
      dragging.current = null
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      setWidths(ws => { save(ws); return ws })
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [widths, storageKey, minWidths])

  /**
   * Auto-fit column idx to its content.
   * Reads scrollWidth of the first child in every [data-col="idx"] cell inside container.
   */
  const autoFit = useCallback((e: React.MouseEvent, idx: number, container: HTMLElement | null) => {
    e.preventDefault()
    e.stopPropagation()
    if (!container) return

    const cells = container.querySelectorAll<HTMLElement>(`[data-col="${idx}"]`)
    const min = minWidths?.[idx] ?? 40
    let maxW = min

    cells.forEach(cell => {
      // firstElementChild is the actual content (span, div, svg…), not clipped by the grid column
      const child = cell.firstElementChild as HTMLElement | null
      const measured = child ? child.scrollWidth : cell.scrollWidth
      // 16px = 8px left + 8px right cell padding
      maxW = Math.max(maxW, measured + 16)
    })

    setWidths(ws => { const n = [...ws]; n[idx] = maxW; save(n); return n })
  }, [minWidths, storageKey])

  const template = widths.map(w => `${w}px`).join(' ')

  return { widths, template, startResize, autoFit }
}
