/**
 * Deletes the unused Aug 2026 hearts-room Worker.
 * Stops without deleting when another Worker still depends on it.
 * A later deploy skips the delete once the Worker is already gone.
 */
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const SCRIPT_NAME = 'hearts-room'
const PUBLIC_URL = 'https://hearts-room.cardparlour.workers.dev/'

/**
 * @param {{ success?: boolean, errors?: { code?: number, message?: string }[], result?: unknown }} refs
 * @param {{ success?: boolean, errors?: { code?: number, message?: string }[], result?: unknown } | null} tails
 * @param {{ refsStatus?: number }} [opts]
 * @returns {{ action: 'skip' | 'delete' | 'stop', reason: string }}
 */
export function retireAction(refs, tails, opts = {}) {
  if (isMissing(refs, opts.refsStatus)) {
    return { action: 'skip', reason: 'hearts-room is already gone' }
  }
  if (refs?.success !== true) {
    return { action: 'stop', reason: `Could not read hearts-room references: ${JSON.stringify(refs?.errors ?? refs)}` }
  }
  if (!tails || tails.success !== true) {
    if (tails && isMissing(tails)) {
      return { action: 'skip', reason: 'hearts-room is already gone' }
    }
    return { action: 'stop', reason: `Could not read hearts-room tails: ${JSON.stringify(tails?.errors ?? tails)}` }
  }

  const result = refs.result && typeof refs.result === 'object' ? refs.result : {}
  const services = result.services && typeof result.services === 'object' ? result.services : {}
  const incoming = Array.isArray(services.incoming) ? services.incoming : []
  const durableObjects = Array.isArray(result.durable_objects) ? result.durable_objects : []
  const foreignObjects = durableObjects.filter((ref) => ref?.service !== SCRIPT_NAME)
  const outbounds = Array.isArray(result.dispatch_outbounds) ? result.dispatch_outbounds : []
  const tailList = Array.isArray(tails.result) ? tails.result : null
  if (tailList == null) {
    return { action: 'stop', reason: 'hearts-room tail list was not a list' }
  }

  const reasons = []
  if (incoming.length > 0) reasons.push(`${incoming.length} service binding(s)`)
  if (services.pages_function === true) reasons.push('a Pages function binding')
  if (foreignObjects.length > 0) reasons.push(`${foreignObjects.length} Durable Object binding(s)`)
  if (outbounds.length > 0) reasons.push(`${outbounds.length} dispatch outbound(s)`)
  if (tailList.length > 0) reasons.push(`${tailList.length} tail producer(s)`)
  if (reasons.length > 0) {
    return {
      action: 'stop',
      reason: `hearts-room is still in use (${reasons.join(', ')}). Not deleted.`,
    }
  }
  return { action: 'delete', reason: 'nothing current depends on hearts-room' }
}

function isMissing(body, status) {
  if (status === 404) return true
  const errors = Array.isArray(body?.errors) ? body.errors : []
  return errors.some((error) => error?.code === 10007)
}

async function cf(accountId, token, path) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

async function publicStatus() {
  const res = await fetch(PUBLIC_URL, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
  return res.status
}

async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!token || !accountId) {
    console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required')
    process.exit(1)
  }

  const refs = await cf(accountId, token, `/workers/scripts/${SCRIPT_NAME}/references`)
  const missing = isMissing(refs.body, refs.status)
  const tails = missing ? { status: 404, body: { success: false, errors: [{ code: 10007 }] } } : await cf(accountId, token, `/workers/tails/by-consumer/${SCRIPT_NAME}`)
  const decision = retireAction(refs.body, tails.body, { refsStatus: refs.status })
  console.log(decision.reason)
  if (decision.action === 'stop') process.exit(1)
  if (decision.action === 'delete') {
    const deleted = spawnSync('npx', ['wrangler', 'delete', '--name', SCRIPT_NAME], { stdio: 'inherit' })
    if (deleted.status !== 0) process.exit(deleted.status ?? 1)
  }

  const status = await publicStatus()
  console.log(`hearts-room HTTP ${status}`)
  if (status === 200) {
    console.error('hearts-room still answers')
    process.exit(1)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
