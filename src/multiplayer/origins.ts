/** Browser Origins allowed to create rooms / open sockets against the Worker. */
export const ALLOWED_ORIGIN_EXACT = [
  'https://agarman42.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
] as const

const LAN_DEV = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):5173$/

export function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false
  if ((ALLOWED_ORIGIN_EXACT as readonly string[]).includes(origin)) return true
  return LAN_DEV.test(origin)
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin')
  const allow = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGIN_EXACT[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}
