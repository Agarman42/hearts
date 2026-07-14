import { teamLabel } from '../games/euchre/labels'
import type { EuchreState } from '../games/euchre/engine'
import { SUIT_SYMBOL } from '../core/types'
import './SpadesPlayerHud.css'

interface Props {
  state: EuchreState
  active?: boolean
  yourSeat?: 0 | 1 | 2 | 3
}

export function EuchrePlayerHud({ state, active = false, yourSeat = 0 }: Props) {
  const trump = state.trump ? SUIT_SYMBOL[state.trump] : '—'
  const maker = state.maker != null ? state.players[state.maker].name : null
  const youAreDealer = state.dealer === yourSeat
  const trumpBit = state.trump ? `${trump} trump` : null
  const makerBit = maker && state.phase !== 'bidding' ? `${maker} ordered` : null

  const phaseLabel =
    state.phase === 'bidding'
      ? `Round ${state.biddingRound}${youAreDealer ? ' · Dealer' : ''}`
      : state.phase === 'loner_choice'
        ? trumpBit
          ? `${trumpBit} · go alone?`
          : 'Go alone?'
        : state.phase === 'discard'
          ? [
              trumpBit,
              makerBit,
              youAreDealer ? 'discard 1 card' : 'dealer discarding',
            ]
              .filter(Boolean)
              .join(' · ')
          : state.loner
            ? trumpBit
              ? `${trumpBit} · loner`
              : 'Loner'
            : trumpBit
              ? [trumpBit, makerBit].filter(Boolean).join(' · ')
              : 'Bidding'

  return (
    <div
      className={['spades-hud', 'spades-hud--euchre', active ? 'spades-hud--active' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="Team scores and hand status"
    >
      <span className="spades-hud__team">
        {teamLabel('ns')} <strong>{state.teamScores.ns}</strong>
      </span>
      <span className="spades-hud__sep" aria-hidden>
        ·
      </span>
      <span className="spades-hud__team">
        {teamLabel('ew')} <strong>{state.teamScores.ew}</strong>
      </span>
      <span className="spades-hud__meta">
        {phaseLabel}
        {maker && state.phase !== 'bidding' ? ` · ${maker}` : ''}
      </span>
    </div>
  )
}