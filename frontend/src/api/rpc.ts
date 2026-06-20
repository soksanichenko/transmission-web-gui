import {
  RPC_STATUS,
  TORRENT_FIELDS,
  DETAILS_FIELDS,
  type Torrent,
  type TorrentDetails,
  type TorrentTracker,
  type SessionInfo,
} from './types'
import { getConnectionConfig } from './config'

let sessionId = ''

async function call<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  const body = JSON.stringify({ method, arguments: args })
  const { url, username, password } = getConnectionConfig()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Transmission-Session-Id': sessionId,
  }
  if (username) headers['Authorization'] = 'Basic ' + btoa(`${username}:${password}`)

  const send = async (sid: string): Promise<Response> => {
    headers['X-Transmission-Session-Id'] = sid
    return fetch(url, { method: 'POST', headers, body })
  }

  let res = await send(sessionId)

  if (res.status === 409) {
    sessionId = res.headers.get('X-Transmission-Session-Id') ?? ''
    res = await send(sessionId)
  }

  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)

  const json = (await res.json()) as { result: string; arguments: T }
  if (json.result !== 'success') throw new Error(`RPC error: ${json.result}`)

  return json.arguments
}

// Raw RPC torrent shape before normalization
interface RawTorrent {
  id: number
  name: string
  percentDone: number
  totalSize: number
  downloadedEver: number
  rateDownload: number
  rateUpload: number
  leftUntilDone: number
  peersSendingToUs: number
  peersGettingFromUs: number
  eta: number
  uploadRatio: number
  addedDate: number
  doneDate: number
  status: number
  downloadDir: string
  error: number
  errorString: string
  trackers: TorrentTracker[]
}

function normalise(raw: RawTorrent): Torrent {
  return {
    ...raw,
    seedsConnected: raw.peersSendingToUs,
    peersConnected: raw.peersGettingFromUs,
    status: raw.error > 0 ? 'error' : (RPC_STATUS[raw.status] ?? 'paused'),
  }
}

export async function getTorrents(): Promise<Torrent[]> {
  const res = await call<{ torrents: RawTorrent[] }>('torrent-get', {
    fields: [...TORRENT_FIELDS],
  })
  return res.torrents.map(normalise)
}

export async function getTorrentDetails(id: number): Promise<TorrentDetails> {
  const res = await call<{ torrents: TorrentDetails[] }>('torrent-get', {
    ids: [id],
    fields: [...DETAILS_FIELDS],
  })
  return res.torrents[0]!
}

export async function startTorrents(ids: number[]): Promise<void> {
  await call('torrent-start', { ids })
}

export async function stopTorrents(ids: number[]): Promise<void> {
  await call('torrent-stop', { ids })
}

export async function removeTorrents(ids: number[], deleteData = false): Promise<void> {
  await call('torrent-remove', { ids, 'delete-local-data': deleteData })
}

export async function recheckTorrents(ids: number[]): Promise<void> {
  await call('torrent-verify', { ids })
}

export async function moveTorrent(id: number, location: string): Promise<void> {
  await call('torrent-set-location', { ids: [id], location, move: false })
}

export async function setTorrentPriority(
  ids: number[],
  priority: 'high' | 'normal' | 'low',
): Promise<void> {
  const p = priority === 'high' ? 1 : priority === 'low' ? -1 : 0
  await call('torrent-set', { ids, bandwidthPriority: p })
}

export async function setFilesWanted(
  id: number,
  fileIndices: number[],
  wanted: boolean,
): Promise<void> {
  const key = wanted ? 'files-wanted' : 'files-unwanted'
  await call('torrent-set', { ids: [id], [key]: fileIndices })
}

export async function setFilePriority(
  id: number,
  fileIndices: number[],
  priority: 'high' | 'normal' | 'low',
): Promise<void> {
  const key = `priority-${priority}`
  await call('torrent-set', { ids: [id], [key]: fileIndices })
}

export async function forceStartTorrents(ids: number[]): Promise<void> {
  await call('torrent-start-now', { ids })
}

export async function reannounce(ids: number[]): Promise<void> {
  await call('torrent-reannounce', { ids })
}

export async function queueMove(ids: number[], where: 'top' | 'up' | 'down' | 'bottom'): Promise<void> {
  await call(`queue-move-${where}`, { ids })
}

export async function renameTorrent(id: number, path: string, name: string): Promise<void> {
  await call('torrent-rename-path', { ids: [id], path, name })
}

export interface TorrentProps {
  downloadLimit: number
  downloadLimited: boolean
  uploadLimit: number
  uploadLimited: boolean
  peerLimit: number
  seedRatioLimit: number
  seedRatioMode: number
  seedIdleLimit: number
  seedIdleMode: number
  trackers: { announce: string; id: number }[]
}

export async function getTorrentProps(id: number): Promise<TorrentProps> {
  const res = await call<{ torrents: TorrentProps[] }>('torrent-get', {
    ids: [id],
    fields: [
      'downloadLimit', 'downloadLimited', 'uploadLimit', 'uploadLimited',
      'peerLimit', 'seedRatioLimit', 'seedRatioMode', 'seedIdleLimit', 'seedIdleMode',
      'trackers',
    ],
  })
  return res.torrents[0]!
}

export async function saveTorrentProps(
  id: number,
  props: Partial<{
    downloadLimit: number; downloadLimited: boolean
    uploadLimit: number; uploadLimited: boolean
    peerLimit: number
    seedRatioLimit: number; seedRatioMode: number
    seedIdleLimit: number; seedIdleMode: number
    trackerList: string
  }>,
): Promise<void> {
  await call('torrent-set', { ids: [id], ...props })
}

export async function getMagnetLink(id: number): Promise<string> {
  const res = await call<{ torrents: { magnetLink: string }[] }>('torrent-get', {
    ids: [id],
    fields: ['magnetLink'],
  })
  return res.torrents[0]?.magnetLink ?? ''
}

export async function addTorrentFile(
  metainfo: string,
  downloadDir: string,
  paused: boolean,
): Promise<void> {
  await call('torrent-add', { metainfo, 'download-dir': downloadDir, paused })
}

export async function addMagnet(
  filename: string,
  downloadDir: string,
  paused: boolean,
): Promise<void> {
  await call('torrent-add', { filename, 'download-dir': downloadDir, paused })
}

export async function getSession(): Promise<SessionInfo> {
  return call<SessionInfo>('session-get')
}

export async function setSession(args: Partial<SessionInfo>): Promise<void> {
  await call('session-set', args as Record<string, unknown>)
}
