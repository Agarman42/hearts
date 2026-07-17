import { teamLabel } from '../games/euchre/labels'
import type { EuchreState } from '../games/euchre/engine'
import { displayMatchScore } from '../games/euchre/scoring'
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
  const youAreDealer = state.dealer === yourSeat
  const youAreMaker = state.maker === yourSeat
  const yourTricks = you.tricksWon
  const raceTo = state.rules.raceTo
  const sittingOut = state.loner && state.sittingOut === yourSeat
  const showTricks =
    state.phase === 'playing' ||
    state.phase === 'trick_reveal' ||
    state.phase === 'hand_result' ||
    state.phase === 'discard' ||
    state.phase === 'loner_choice'

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
        youAreMaker ? 'spades-hud--maker' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`Your seat — ${yourTricks} tricks this hand`}
    >
      <div className="spades-hud__identity spades-hud__identity--with-avatar">
        <Avatar characterId={you.characterId} size="md" active={active} />
        <div className="spades-hud__identity-text">
          <span className="spades-hud__name">
            {you.name}
            {youAreDealer && <span className="spades-hud__dealer">Dealer</span>}
            {youAreMaker && (
              <span className="spades-hud__maker" title="You ordered trump">
                Trump
              </span>
            )}
            {sittingOut && <span className="spades-hud__dealer">Out</span>}
          </span>
          <span className="spades-hud__partner">{partner.name} · partner</span>
          <span className="spades-hud__meta-inline">{phaseLabel}</span>
        </div>
      </div>

      <div className="spades-hud__stats">
        {showTricks && (
          <div
            className={[
              'spades-hud__chip',
              'spades-hud__chip--tricks',
              yourTricks > 0 ? 'is-hot' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title="Tricks you've taken this hand"
          >
            <span className="spades-hud__chip-label">Tricks</span>
            <span className="spades-hud__chip-value">{yourTricks}</span>
          </div>
        )}
        <div className="spades-hud__score" title={`${teamLabel(yourTeam)} score`}>
          <span className="spades-hud__score-label">{teamLabel(yourTeam)}</span>
          <span className="spades-hud__score-value">
            {displayMatchScore(state.teamScores[yourTeam], raceTo)}
          </span>
        </div>
        <div
          className="spades-hud__score spades-hud__score--opp"
          title={`${teamLabel(oppTeam)} score`}
        >
          <span className="spades-hud__score-label">{teamLabel(oppTeam)}</span>
          <span className="spades-hud__score-value">
            {displayMatchScore(state.teamScores[oppTeam], raceTo)}
          </span>
        </div>
      </div>
    </div>
  )
}
