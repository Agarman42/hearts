import type { GameId } from '../games/registry'
import {
  DEFAULT_HEARTS_RULES,
  type HeartsRulesConfig,
} from '../games/hearts/types'
import {
  DEFAULT_SPADES_RULES,
  type SpadesRulesConfig,
} from '../games/spades/types'
import {
  DEFAULT_EUCHRE_RULES,
  type EuchreRulesConfig,
} from '../games/euchre/types'
import type { RoomRulesSnapshot } from './protocol'

function pickKnown<T extends object>(defaults: T, raw: unknown): T {
  if (!raw || typeof raw !== 'object') return { ...defaults }
  const src = raw as Record<string, unknown>
  const out = { ...defaults } as T
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const incoming = src[String(key)]
    if (incoming !== undefined && typeof incoming === typeof defaults[key]) {
      out[key] = incoming as T[keyof T]
    }
  }
  return out
}

export function defaultRoomRules(gameId: GameId): RoomRulesSnapshot {
  if (gameId === 'spades') return { gameId: 'spades', spades: { ...DEFAULT_SPADES_RULES } }
  if (gameId === 'euchre') return { gameId: 'euchre', euchre: { ...DEFAULT_EUCHRE_RULES } }
  return { gameId: 'hearts', hearts: { ...DEFAULT_HEARTS_RULES } }
}

export function snapshotRoomRules(
  gameId: GameId,
  prefs: {
    rules?: Partial<HeartsRulesConfig>
    spadesRules?: Partial<SpadesRulesConfig>
    euchreRules?: Partial<EuchreRulesConfig>
  },
): RoomRulesSnapshot {
  if (gameId === 'spades') {
    return { gameId: 'spades', spades: { ...DEFAULT_SPADES_RULES, ...prefs.spadesRules } }
  }
  if (gameId === 'euchre') {
    return { gameId: 'euchre', euchre: { ...DEFAULT_EUCHRE_RULES, ...prefs.euchreRules } }
  }
  return { gameId: 'hearts', hearts: { ...DEFAULT_HEARTS_RULES, ...prefs.rules } }
}

export function sanitizeRoomRules(gameId: GameId, raw: unknown): RoomRulesSnapshot {
  if (!raw || typeof raw !== 'object') return defaultRoomRules(gameId)
  const obj = raw as { gameId?: unknown; hearts?: unknown; spades?: unknown; euchre?: unknown }
  if (gameId === 'spades') {
    return { gameId: 'spades', spades: pickKnown(DEFAULT_SPADES_RULES, obj.spades) }
  }
  if (gameId === 'euchre') {
    return { gameId: 'euchre', euchre: pickKnown(DEFAULT_EUCHRE_RULES, obj.euchre) }
  }
  return { gameId: 'hearts', hearts: pickKnown(DEFAULT_HEARTS_RULES, obj.hearts) }
}

export function formatRoomRules(rules: RoomRulesSnapshot | undefined, gameId: GameId): string[] {
  const snap = rules ?? defaultRoomRules(gameId)
  if (snap.gameId === 'hearts') {
    const r = snap.hearts
    const lines = [`Race to ${r.raceTo}`, `Pass ${r.passCount}`]
    if (r.shootTheMoon) lines.push(r.moonScoring === 'classic' ? 'Moon' : `Moon (${r.moonScoring})`)
    if (r.jackOfDiamonds) lines.push('J♦ −10')
    return lines
  }
  if (snap.gameId === 'spades') {
    const r = snap.spades
    const lines = [`Race to ${r.raceTo}`]
    if (r.nilBids) lines.push('Nil')
    if (r.blindNil) lines.push('Blind nil')
    if (r.bagPenalty) lines.push(`Bags ${r.bagsPerPenalty}/−${r.bagPenaltyPoints}`)
    if (r.bagMercy) lines.push('Bag mercy')
    return lines
  }
  const r = snap.euchre
  const lines = [`Race to ${r.raceTo}`]
  if (r.stickTheDealer) lines.push('Stick the dealer')
  if (r.lonersEnabled) lines.push('Loners')
  if (r.farmersHand) lines.push("Farmer's hand")
  if (r.screwTheDealer) lines.push('Screw the dealer')
  return lines
}
