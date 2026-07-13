/** Spades — standard American rules (product defaults from design lock). */

export interface SpadesRulesConfig {
  /** First team to this score wins (standard: 500). */
  raceTo: number
  /** Nil bid allowed. */
  nilBids: boolean
  /** Blind nil allowed (house rule — off by default for casual). */
  blindNil: boolean
  /** Bag penalty: every 10 bags → −100 (standard American). */
  bagPenalty: boolean
  bagsPerPenalty: number
  bagPenaltyPoints: number
  /** Must follow spades once broken (standard). */
  spadesBroken: boolean
}

export const DEFAULT_SPADES_RULES: SpadesRulesConfig = {
  raceTo: 500,
  nilBids: true,
  blindNil: false,
  bagPenalty: true,
  bagsPerPenalty: 10,
  bagPenaltyPoints: 100,
  spadesBroken: true,
}

/**
 * Partnership layout: you (South/0) ↔ partner (North/2).
 * Opponents: West/1 and East/3. See core/partnership.ts.
 */