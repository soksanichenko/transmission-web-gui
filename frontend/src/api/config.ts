const STORAGE_KEY = 'transmission-connection'

export interface ConnectionConfig {
  url: string
  username: string
  password: string
}

const DEFAULT: ConnectionConfig = {
  url: '/transmission/rpc',
  username: '',
  password: '',
}

/** Populated once by loadServerConfig() before first render. */
let serverConfig: Partial<ConnectionConfig> = {}

/**
 * Fetch current config from the config-api backend.
 * Call once at app startup (before ReactDOM.createRoot).
 */
export async function loadServerConfig(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/config`, { cache: 'no-cache' })
    if (!res.ok) return
    const json = (await res.json()) as Record<string, unknown>
    // Support both "rpcUrl" and "url" keys
    const url = (json['rpcUrl'] ?? json['url']) as string | undefined
    const username = json['username'] as string | undefined
    const password = json['password'] as string | undefined
    if (url)      serverConfig.url      = url
    if (username !== undefined) serverConfig.username = username
    if (password !== undefined) serverConfig.password = password
  } catch {
    // No config.json — fall back to defaults / localStorage
  }
}

/**
 * Effective config: DEFAULT ← serverConfig ← localStorage overrides.
 */
export function getConnectionConfig(): ConnectionConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const local = raw ? (JSON.parse(raw) as Partial<ConnectionConfig>) : {}
    return { ...DEFAULT, ...serverConfig, ...local }
  } catch {
    return { ...DEFAULT, ...serverConfig }
  }
}

/** Save to localStorage (immediate, this browser only). */
export function setConnectionConfig(cfg: ConnectionConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

/** Persist to server config.json via the backend API. */
export async function saveServerConfig(cfg: ConnectionConfig): Promise<void> {
  const body = JSON.stringify({ rpcUrl: cfg.url, username: cfg.username, password: cfg.password })
  const res = await fetch(`${import.meta.env.BASE_URL}api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) throw new Error(`Failed to save config: ${res.status}`)
}

/** Returns the values that came from the server config (for UI hints). */
export function getServerConfig(): Partial<ConnectionConfig> {
  return { ...serverConfig }
}
