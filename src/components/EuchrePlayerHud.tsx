import { teamLabel } from '../games/euchre/labels'
import type { EuchreState } from '../games/euchre/engine'
import { SUIT_SYMBOL } from '../core/types'
import './SpadesPlayerHud.css'

interface Props {
  state: EuchreState
  active?: boolean
}

export function EuchrePlayerHud({ state, active = false }: Props) {
  const trump = state.trump ? SUIT_SYMBOL[state.trump] : '—'
  const maker = state.maker != null ? state.players[state.maker].name : null
  const phaseLabel =
    state.phase === 'bidding'
      ? `Round ${state.biddingRound}`
      : state.phase === 'loner_choice'
        ? 'Go alone?'
        : state.phase === 'discard'
          ? 'Discard'
          : state.loner
            ? 'Loner'
            : state.trump
              ? `Trump ${trump}`
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