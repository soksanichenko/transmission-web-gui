export interface TorrentFileEntry {
  path: string
  length: number
}

type Bencode = number | Uint8Array | Bencode[] | Map<string, Bencode>

const utf8 = new TextDecoder('utf-8')
const utf8Strict = new TextDecoder('utf-8', { fatal: true })

function decode(data: Uint8Array, pos: number): [Bencode, number] {
  const c = data[pos]
  if (c === undefined) throw new Error('eof')

  if (c === 0x69) { // i<digits>e
    const end = data.indexOf(0x65, pos)
    if (end < 0) throw new Error('eof')
    return [Number(utf8.decode(data.subarray(pos + 1, end))), end + 1]
  }

  if (c === 0x6c || c === 0x64) { // l...e or d...e
    const items: Bencode[] = []
    let p = pos + 1
    while (data[p] !== 0x65) {
      const [v, next] = decode(data, p)
      items.push(v)
      p = next
    }
    if (c === 0x6c) return [items, p + 1]
    const dict = new Map<string, Bencode>()
    for (let i = 0; i + 1 < items.length; i += 2) {
      const k = items[i]
      if (k instanceof Uint8Array) dict.set(utf8.decode(k), items[i + 1]!)
    }
    return [dict, p + 1]
  }

  // <length>:<bytes>
  const colon = data.indexOf(0x3a, pos)
  if (colon < 0) throw new Error('bad string')
  const len = Number(utf8.decode(data.subarray(pos, colon)))
  const start = colon + 1
  if (!Number.isInteger(len) || len < 0 || start + len > data.length) throw new Error('bad string')
  return [data.subarray(start, start + len), start + len]
}

const isLength = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0

// Names are UTF-8 unless a legacy client wrote them in the root `encoding` (e.g. cp1251).
function decodeName(v: Bencode | undefined, encoding: string | undefined): string | undefined {
  if (!(v instanceof Uint8Array)) return undefined
  try { return utf8Strict.decode(v) } catch { /* not UTF-8 */ }
  if (encoding) {
    try { return new TextDecoder(encoding).decode(v) } catch { /* unknown label */ }
  }
  return utf8.decode(v)
}

/** Returns the file list of a .torrent in info.files order, or null if it can't be parsed. */
export function parseTorrentFiles(bytes: Uint8Array): TorrentFileEntry[] | null {
  try {
    const [root] = decode(bytes, 0)
    const info = root instanceof Map ? root.get('info') : undefined
    if (!(info instanceof Map)) return null
    const enc = root instanceof Map ? decodeName(root.get('encoding'), undefined) : undefined

    const files = info.get('files')
    if (!Array.isArray(files)) {
      const name = decodeName(info.get('name'), enc)
      const length = info.get('length')
      return name !== undefined && isLength(length) ? [{ path: name, length }] : null
    }

    const out: TorrentFileEntry[] = []
    for (const f of files) {
      if (!(f instanceof Map)) return null
      const length = f.get('length')
      const parts = f.get('path.utf-8') ?? f.get('path')
      if (!isLength(length) || !Array.isArray(parts)) return null
      out.push({ path: parts.map(p => decodeName(p, enc) ?? '').join('/'), length })
    }
    return out
  } catch {
    return null
  }
}
