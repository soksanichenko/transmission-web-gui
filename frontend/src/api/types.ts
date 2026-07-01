export type TorrentStatus =
  | 'downloading'
  | 'seeding'
  | 'paused'
  | 'checking'
  | 'queued'
  | 'error'

/** Maps Transmission RPC `status` integer → our string status. */
export const RPC_STATUS: Record<number, TorrentStatus> = {
  0: 'paused',
  1: 'queued',   // queued to check
  2: 'checking',
  3: 'queued',   // queued to download
  4: 'downloading',
  5: 'queued',   // queued to seed
  6: 'seeding',
}

export interface TorrentTracker {
  announce: string
  id: number
}

export interface Torrent {
  id: number
  name: string
  percentDone: number
  recheckProgress: number
  totalSize: number
  downloadedEver: number
  uploadedEver: number
  rateDownload: number
  rateUpload: number
  leftUntilDone: number
  seedsConnected: number
  peersConnected: number
  eta: number
  uploadRatio: number
  addedDate: number
  doneDate: number
  status: TorrentStatus
  downloadDir: string
  error: number
  errorString: string
  trackers: TorrentTracker[]
  labels: string[]
}

export interface TorrentFile {
  name: string
  length: number
  bytesCompleted: number
}

export interface TorrentFileStats {
  bytesCompleted: number
  wanted: boolean
  priority: number
}

export interface Peer {
  address: string
  clientName: string
  rateToClient: number
  rateToPeer: number
  flagStr: string
}

export interface Tracker {
  announce: string
  lastAnnounceResult: string
  nextAnnounceTime: number
  lastAnnouncePeerCount: number
  seederCount: number
}

export interface TorrentDetails {
  id: number
  files: TorrentFile[]
  fileStats: TorrentFileStats[]
  peers: Peer[]
  trackerStats: Tracker[]
  // Info tab
  hashString: string
  comment: string
  creator: string
  dateCreated: number
  pieceCount: number
  pieceSize: number
  magnetLink: string
  activityDate: number
  uploadedEver: number
  corruptEver: number
  downloadLimit: number
  downloadLimited: boolean
  uploadLimit: number
  uploadLimited: boolean
  peerLimit: number
  secondsDownloading: number
  secondsSeeding: number
}

export interface SessionInfo {
  version: string
  'download-dir': string
  'download-dir-free-space': number
  'speed-limit-down': number
  'speed-limit-down-enabled': boolean
  'speed-limit-up': number
  'speed-limit-up-enabled': boolean
  'alt-speed-enabled': boolean
  'alt-speed-down': number
  'alt-speed-up': number
  'peer-port': number
  'seedRatioLimit': number
  'seedRatioLimited': boolean
  'download-queue-size': number
  'seed-queue-size': number
}

export const TORRENT_FIELDS = [
  'id',
  'name',
  'percentDone',
  'recheckProgress',
  'totalSize',
  'downloadedEver',
  'uploadedEver',
  'rateDownload',
  'rateUpload',
  'leftUntilDone',
  'peersSendingToUs',
  'peersGettingFromUs',
  'eta',
  'uploadRatio',
  'addedDate',
  'doneDate',
  'status',
  'downloadDir',
  'error',
  'errorString',
  'trackers',
  'labels',
] as const

export const DETAILS_FIELDS = [
  'id',
  'files',
  'fileStats',
  'peers',
  'trackerStats',
  'hashString',
  'comment',
  'creator',
  'dateCreated',
  'pieceCount',
  'pieceSize',
  'magnetLink',
  'activityDate',
  'uploadedEver',
  'corruptEver',
  'downloadLimit',
  'downloadLimited',
  'uploadLimit',
  'uploadLimited',
  'peerLimit',
  'secondsDownloading',
  'secondsSeeding',
] as const
