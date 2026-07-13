/** Euchre — defaults + user-toggle house rules. */

export interface EuchreRulesConfig {
  /** First team to this many points wins (standard: 10). */
  raceTo: number
  /** Dealer must name trump if everyone passes twice (default on). */
  stickTheDealer: boolean
  /**
   * Farmer's hand (loose): dealer's partner may pass with only 9s/10s in hand.
   * Strict: any card 9+ counts as a "point" for passing threshold.
   */
  farmersHand: boolean
  /** Loner (shooting) always available when you ordered trump. */
  lonersEnabled: boolean
  /** Steal deal / screw the dealer — optional chaos rule (off default). */
  screwTheDealer: boolean
}

export const DEFAULT_EUCHRE_RULES: EuchreRulesConfig = {
  raceTo: 10,
  stickTheDealer: true,
  farmersHand: false,
  lonersEnabled: true,
  screwTheDealer: false,
}