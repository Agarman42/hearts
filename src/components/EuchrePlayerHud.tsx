import { teamLabel } from '../games/euchre/labels'
import type { EuchreState } from '../games/euchre/engine'
import { displayMatchScore } from '../games/euchre/scoring'
import { SUIT_SYMBOL } from '../core/types'
import { partnerOf, partnershipOf } from '../core/partnership'
import { Avatar } from './Avatar'
import './SpadesPlayerHud.css'
import './EuchreTable.css'

interface Props {
  state: EuchreState
  active?: boolean
  yourSeat?: 0 | 1 | 2 | 3
}

export function EuchrePlayerHud({ state, active = false, yourSeat = 0 }: Props) {
  const you = state.players[yourSeat]
  const partner = state.players[partnerOf(yourSeat)]
  const yourTeam = partnershipOf(yourSeat)
  const oppTeam = yourTeam === 'ns' ? 'ew' : 'ns'
  const trumpSym = state.trump ? SUIT_SYMBOL[state.trump] : null
  const maker = state.maker != null ? state.players[state.maker].name : null
  const youAreDealer = state.dealer === yourSeat
  const yourTricks = you.tricksWon
  const raceTo = state.rules.raceTo
  const sittingOut = state.loner && state.sittingOut === yourSeat

  const phaseLabel =
    state.phase === 'bidding'
      ? `Round ${state.biddingRound}`
      : state.phase === 'loner_choice'
        ? 'Go alone?'
        : state.phase === 'discard'
          ? youAreDealer
            ? 'Discard one'
            : 'Dealer discarding'
          : sittingOut
            ? 'Sitting out'
            : state.loner
              ? 'Loner hand'
              : 'Playing'

  return (
    <div
      className={[
        'spades-hud',
        'spades-hud--euchre',
        'spades-hud--seatlike',
        active ? 'spades-hud--active' : '',
        sittingOut ? 'spades-hud--out' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Your seat — team scores and hand status"
    >
      <div className="spades-hud__identity spades-hud__identity--with-avatar">
        <Avatar characterId={you.characterId} size="md" active={active} />
        <div className="spades-hud__identity-text">
          <span className="spades-hud__name">
            {you.name}
            {youAreDealer && <span className="spades-hud__dealer">Dealer</span>}
            {sittingOut && <span className="spades-hud__dealer">Out</span>}
          </span>
          <span className="spades-hud__partner">
            {partner.name} · partner
            {(state.phase === 'playing' || state.phase === 'trick_reveal') &&
              ` · ${yourTricks} trick${yourTricks === 1 ? '' : 's'}`}
          </span>
          <span className="spades-hud__meta-inline">{phaseLabel}</span>
        </div>
      </div>

      <div className="spades-hud__stats">
        {trumpSym && state.phase !== 'bidding' && (
          <span className="euchre-hud__trump" aria-label={`Trump ${state.trump}`}>
            <span className="euchre-hud__trump-label">Trump</span>
            <span className="euchre-hud__trump-suit">{trumpSym}</span>
            {maker && <span className="euchre-hud__trump-maker">{maker}</span>}
          </span>
        )}
        <div className="spades-hud__score" title={`${teamLabel(yourTeam)} score`}>
          <span className="spades-hud__score-label">{teamLabel(yourTeam)}</span>
          <span className="spades-hud__score-value">
            {displayMatchScore(state.teamScores[yourTeam], raceTo)}
          </span>
        </div>
        <div className="spades-hud__score spades-hud__score--opp" title={`${teamLabel(oppTeam)} score`}>
          <span className="spades-hud__score-label">{teamLabel(oppTeam)}</span>
          <span className="spades-hud__score-value">
            {displayMatchScore(state.teamScores[oppTeam], raceTo)}
          </span>
        </div>
      </div>
    </div>
  )
}
