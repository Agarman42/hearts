import { Seat } from '../core/types'
import { HeartsPlayerState } from '../games/hearts/engine'
import { Avatar } from './Avatar'
import { CardView } from './CardView'
import { makeCard } from '../core/cards'
import './PlayerSeat.css'

interface Props {
  player: HeartsPlayerState
  position: 'north' | 'east' | 'south' | 'west'
  isTurn: boolean
  cardCount: number
  raceTo?: number
}

const DIFF_LABEL = {
  easy: 'Easy',
  medium: 'Med',
  hard: 'Hard',
}

/** Dummy card for face-down fan rendering */
const BACK = makeCard('spades', 'A')

export function PlayerSeat({
  player,
  position,
  isTurn,
  cardCount,
  raceTo = 100,
}: Props) {
  // Visual fan only (not a count badge) — still uses cardCount for thickness
  const fanCount = Math.min(cardCount, 10)
  const vertical = position === 'west' || position === 'east'

  const a11y = [
    player.name,
    `score ${player.totalScore}`,
    player.handHearts > 0 ? `${player.handHearts} hearts` : null,
    player.hasQueen ? 'has the queen' : null,
    isTurn ? 'their turn' : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className={`seat seat--${position} ${isTurn ? 'seat--active' : ''} ${
        player.hasQueen ? 'seat--has-queen' : ''
      } ${player.handHearts > 0 ? 'seat--has-hearts' : ''}`}
      data-seat={player.seat as Seat}
      data-seat-anchor={player.seat as Seat}
      role="group"
      aria-label={a11y}
    >
      {!player.isHuman && fanCount > 0 && (
        <div className={`seat__fan seat__fan--${position}`} aria-hidden>
          {Array.from({ length: fanCount }).map((_, i) => (
            <div
              key={i}
              className="seat__fan-card"
              style={
                vertical
                  ? { top: `${i * 7}px`, zIndex: i }
                  : { left: `${i * 8}px`, zIndex: i }
              }
            >
              <CardView card={BACK} faceDown size="mini" />
            </div>
          ))}
        </div>
      )}

      <div className="seat__core">
        <Avatar
          characterId={player.characterId}
          size={position === 'north' ? 'md' : 'xs'}
          active={isTurn}
        />
        <div className="seat__info">
          <div className="seat__name-line">
            <span className="seat__name">{player.name}</span>
            {!player.isHuman && (
              <span className="seat__diff">{DIFF_LABEL[player.difficulty]}</span>
            )}
          </div>
          <div className="seat__score-line">
            <span className="seat__score" title="Match score">
              <span className="seat__score-label">Score</span>
              <span className="seat__score-value">{player.totalScore}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="seat__penalties" aria-label="Points this hand">
        <div
          className={`seat__chip seat__chip--hearts ${
            player.handHearts > 0 ? 'is-hot' : ''
          }`}
          title="Hearts this hand"
        >
          <span className="seat__chip-icon">♥</span>
          <span className="seat__chip-value">{player.handHearts}</span>
        </div>
        <div
          className={`seat__chip seat__chip--queen ${
            player.hasQueen ? 'is-hot' : ''
          }`}
          title="Queen of Spades"
        >
          <span className="seat__chip-icon">♠</span>
          <span className="seat__chip-value">{player.hasQueen ? 'Q' : '–'}</span>
        </div>
      </div>

      <div
        className="seat__race"
        title={`Score ${player.totalScore}`}
        aria-hidden
      >
        <div
          className="seat__race-fill"
          style={{
            width: `${Math.min(100, (player.totalScore / Math.max(1, raceTo)) * 100)}%`,
          }}
        />
      </div>

      {isTurn && <div className="seat__turn-pulse" aria-hidden />}
      {player.hasQueen && (
        <div className="seat__queen-flare" aria-hidden title="Has the Queen">
          ♠
        </div>
      )}
    </div>
  )
}
