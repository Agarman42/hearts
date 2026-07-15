import { teamLabel } from '../games/euchre/labels'
import type { EuchreState } from '../games/euchre/engine'
import { displayMatchScore } from '../games/euchre/scoring'
import { SUIT_SYMBOL } from '../core/types'
import './SpadesPlayerHud.css'

interface Props {
  state: EuchreState
  active?: boolean
  yourSeat?: 0 | 1 | 2 | 3
}

export function EuchrePlayerHud({ state, active = false, yourSeat = 0 }: Props) {
  const trumpSym = state.trump ? SUIT_SYMBOL[state.trump] : null
  const maker = state.maker != null ? state.players[state.maker].name : null
  const youAreDealer = state.dealer === yourSeat
  const yourTricks = state.players[yourSeat].tricksWon
  const raceTo = state.rules.raceTo

  const phaseLabel =
    state.phase === 'bidding'
      ? `Round ${state.biddingRound}${youAreDealer ? ' · Dealer' : ''}`
      : state.phase === 'loner_choice'
        ? 'Go alone?'
        : state.phase === 'discard'
          ? youAreDealer
            ? 'Discard one card'
            : 'Dealer discarding'
          : state.loner
            ? 'Loner hand'
            : 'Playing'

  return (
    <div
      className={['spades-hud', 'spades-hud--euchre', active ? 'spades-hud--active' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="Team scores and hand status"
    >
      {trumpSym && state.phase !== 'bidding' && (
        <span className="euchre-hud__trump" aria-label={`Trump ${state.trump}`}>
          <span className="euchre-hud__trump-label">Trump</span>
          <span className="euchre-hud__trump-suit">{trumpSym}</span>
          {maker && <span className="euchre-hud__trump-maker">{maker}</span>}
        </span>
      )}
      <span className="euchre-hud__team">
        <span className="euchre-hud__team-label">{teamLabel('ns')}</span>
        <strong className="euchre-hud__team-score">
          {displayMatchScore(state.teamScores.ns, raceTo)}
        </strong>
      </span>
      <span className="spades-hud__sep" aria-hidden>
        ·
      </span>
      <span className="euchre-hud__team">
        <span className="euchre-hud__team-label">{teamLabel('ew')}</span>
        <strong className="euchre-hud__team-score">
          {displayMatchScore(state.teamScores.ew, raceTo)}
        </strong>
      </span>
      {(state.phase === 'playing' || state.phase === 'trick_reveal') && (
        <>
          <span className="spades-hud__sep" aria-hidden>
            ·
          </span>
          <span className="euchre-hud__tricks">
            You: <strong>{yourTricks}</strong> trick{yourTricks === 1 ? '' : 's'}
          </span>
        </>
      )}
      <span className="spades-hud__meta">{phaseLabel}</span>
    </div>
  )
}