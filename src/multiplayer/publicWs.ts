/** Public room Worker — friends join over the internet through this host. */
export const PRODUCTION_WS_URL = 'wss://cardparlour.workers.dev'

export function roomServerUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_URL
  if (fromEnv) return fromEnv
  if (import.meta.env.PROD) return PRODUCTION_WS_URL
  return 'ws://127.0.0.1:8787'
}
