import { Seat } from '../core/types'
import { isHeartsExtras, type SeatView } from '../games/tablePlayer'
import { Avatar } from './Avatar'
import { CardView } from './CardView'
import { makeCard } from '../core/cards'
import './PlayerSeat.css'

interface Props {
  player: SeatView
  position: 'north' | 'east' | 'south' | 'west'
  isTurn: boolean
  cardCount?: number
  raceTo?: number
  isDealer?: boolean
  biddingPhase?: boolean
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
  isDealer = false,
  biddingPhase = false,
}: Props) {
  const count = cardCount ?? player.cardCount
  const extras = player.extras
  const heartsExtras = extras && isHeartsExtras(extras) ? extras : null
  const spadesExtras = extras && !isHeartsExtras(extras) ? extras : null
  const handHearts = heartsExtras?.handHearts ?? 0
  const hasQueen = heartsExtras?.hasQueen ?? false

  const fanCount = Math.min(count, 10)
  const vertical = position === 'west' || position === 'east'

  const a11y = [
    player.name,
    `score ${player.totalScore}`,
    handHearts > 0 ? `${handHearts} hearts` : null,
    hasQueen ? 'has the queen' : null,
    spadesExtras?.bid != null
      ? `bid ${spadesExtras.blindNil ? 'blind nil' : spadesExtras.nil ? 'nil' : spadesExtras.bid}`
      : null,
    spadesExtras ? `${spadesExtras.tricksWon} tricks` : null,
    isTurn ? 'their turn' : null,
    isDealer ? 'dealer' : null,
    biddingPhase && spadesExtras?.bid == null ? 'has not bid' : null,
  ]
    .filter(Boolean)
    .join(', ')

  const bidLocked = spadesExtras?.bid != null
  const bidWaiting = biddingPhase && !bidLocked
  const bidChipLabel =
    spadesExtras && biddingPhase
      ? bidLocked
        ? spadesExtras.blindNil
          ? 'B∅'
          : spadesExtras.nil
            ? '∅'
            : String(spadesExtras.bid)
        : isTurn
          ? 'Bid'
          : 'Wait'
      : spadesExtras?.bid == null
        ? '–'
        : spadesExtras.blindNil
          ? 'B∅'
          : spadesExtras.nil
            ? '∅'
            : spadesExtras.bid

  return (
    <div
      className={`seat seat--${position} ${isTurn ? 'seat--active' : ''} ${
        hasQueen ? 'seat--has-queen' : ''
      } ${handHearts > 0 ? 'seat--has-hearts' : ''} ${
        isDealer ? 'seat--dealer' : ''
      } ${bidWaiting && isTurn ? 'seat--bidding' : ''}`}
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
            {isDealer && (
              <span className="seat__dealer" title="Dealer this hand">
                D
              </span>
            )}
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

      {heartsExtras && (
        <div className="seat__penalties" aria-label="Points this hand">
          <div
            className={`seat__chip seat__chip--hearts ${handHearts > 0 ? 'is-hot' : ''}`}
            title="Hearts this hand"
          >
            <span className="seat__chip-icon">♥</span>
            <span className="seat__chip-value">{handHearts}</span>
          </div>
          <div
            className={`seat__chip seat__chip--queen ${hasQueen ? 'is-hot' : ''}`}
            title="Queen of Spades"
          >
            <span className="seat__chip-icon">♠</span>
            <span className="seat__chip-value">{hasQueen ? 'Q' : '–'}</span>
          </div>
        </div>
      )}
      {spadesExtras && (
        <div className="seat__penalties" aria-label="Bid and tricks">
          <div
            className={[
              'seat__chip',
              'seat__chip--bid',
              bidLocked ? 'is-hot is-locked' : '',
              bidWaiting && isTurn ? 'is-bidding' : '',
              bidWaiting && !isTurn ? 'is-waiting' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={
              biddingPhase
                ? bidLocked
                  ? 'Bid locked in'
                  : isTurn
                    ? 'Bidding now'
                    : 'Waiting to bid'
                : 'Bid this hand'
            }
          >
            <span className="seat__chip-icon">🎯</span>
            <span className="seat__chip-value">{bidChipLabel}</span>
          </div>
          <div
            className={`seat__chip seat__chip--tricks ${spadesExtras.tricksWon > 0 ? 'is-hot' : ''}`}
            title="Tricks won"
          >
            <span className="seat__chip-icon">✓</span>
            <span className="seat__chip-value">{spadesExtras.tricksWon}</span>
          </div>
        </div>
      )}

      <div className="seat__race" title={`Score ${player.totalScore}`} aria-hidden>
        <div
          className="seat__race-fill"
          style={{
            width: `${Math.min(100, (player.totalScore / Math.max(1, raceTo)) * 100)}%`,
          }}
        />
      </div>

      {isTurn && <div className="seat__turn-pulse" aria-hidden />}
    </div>
  )
}