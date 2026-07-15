import { useEffect, useState } from 'react'
import { Seat, SUIT_SYMBOL } from '../core/types'
import { TrickPlay } from '../games/types'
import type { TrickWinnerResolver } from '../core/trick'
import { trickWinner as heartsTrickWinner } from '../games/hearts/rules'
import { CardView } from './CardView'
import './TrickArea.css'

const SEAT_POS: Record<Seat, string> = {
  0: 'south',
  1: 'west',
  2: 'north',
  3: 'east',
}

interface Props {
  plays: TrickPlay[]
  playerNames: Record<Seat, string>
  reveal?: boolean
  highlightWinner?: boolean
  hiddenCardIds?: Set<string>
  /** How long all 4 cards sit before scoop (from speed setting) */
  holdMs?: number
  resolveWinner?: TrickWinnerResolver
}

export function TrickArea({
  plays,
  playerNames,
  reveal,
  highlightWinner = true,
  hiddenCardIds,
  holdMs = 650,
  resolveWinner = heartsTrickWinner,
}: Props) {
  const winnerSeat =
    plays.length > 0 && highlightWinner ? resolveWinner(plays) : null
  const leadSuit = plays[0]?.card.suit
  const winnerName = winnerSeat != null ? playerNames[winnerSeat] : null
  const winnerPos = winnerSeat != null ? SEAT_POS[winnerSeat] : null

  const [collecting, setCollecting] = useState(false)
  const playIdsKey = plays.map((p) => p.card.id).join(',')

  useEffect(() => {
    if (reveal && plays.length === 4 && winnerPos) {
      setCollecting(false)
      const t = window.setTimeout(() => setCollecting(true), holdMs)
      return () => window.clearTimeout(t)
    }
    setCollecting(false)
  }, [reveal, plays.length, winnerPos, holdMs, playIdsKey])

  const showCollect = Boolean(reveal && collecting && winnerPos)
  const showWinnerPulse = Boolean(
    reveal && !collecting && plays.length === 4 && winnerSeat != null,
  )

  return (
    <div
      className={[
        'trick',
        plays.length > 0 ? 'trick--active' : '',
        showCollect ? `trick--collect trick--collect-${winnerPos}` : '',
        reveal && !collecting ? 'trick--holding' : '',
        showWinnerPulse ? 'trick--winner-pulse' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="trick__felt" data-trick-felt>
        {plays.length === 0 && (
          <div className="trick__hint">
            <span className="trick__hint-icon">♠♥♦♣</span>
            <span>Play a card</span>
          </div>
        )}

        {([0, 1, 2, 3] as Seat[]).map((seat) => (
          <div
            key={`anchor-${seat}`}
            className={`trick__anchor trick__play--${SEAT_POS[seat]}`}
            data-trick-anchor={seat}
            aria-hidden
          />
        ))}

        {plays.map((p, i) => {
          const isLead = i === 0
          const isWinning = winnerSeat === p.seat
          const isLastPlayed =
            i === plays.length - 1 && plays.length === 4 && !showCollect
          const hidden = hiddenCardIds?.has(p.card.id) ?? false
          return (
            <div
              key={p.card.id}
              className={[
                'trick__play',
                `trick__play--${SEAT_POS[p.seat]}`,
                isWinning ? 'trick__play--winning' : '',
                isLastPlayed ? 'trick__play--just-in' : '',
                showWinnerPulse && isWinning ? 'trick__play--pulse' : '',
                hidden ? 'trick__play--hidden' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-trick-seat={p.seat}
              data-trick-card={p.card.id}
            >
              {/* Always reserve name row height (invisible during collect) */}
              <div
                className="trick__name"
                style={
                  showCollect || hidden
                    ? { visibility: 'hidden' }
                    : undefined
                }
              >
                {playerNames[p.seat]}
              </div>
              <CardView
                card={p.card}
                size="trick"
                winning={isWinning && !showCollect && !hidden}
                leading={isLead && !isWinning && !showCollect && !hidden}
              />
            </div>
          )
        })}
      </div>

      {/* Always mounted — keeps circle from jumping when status appears/vanishes */}
      <div className="trick__status" aria-live="polite">
        {plays.length > 0 && leadSuit && !showCollect && (
          <span className={`trick__lead trick__lead--${leadSuit}`}>
            Lead {SUIT_SYMBOL[leadSuit]}
          </span>
        )}
        {plays.length > 0 && winnerName && plays.length === 4 && (
          <span
            className={`trick__winning ${showCollect ? 'trick__winning--taken' : ''}`}
          >
            {showCollect ? 'Takes it' : 'Winning'}: <strong>{winnerName}</strong>
          </span>
        )}
        {plays.length > 0 && winnerName && plays.length < 4 && (
          <span className="trick__winning">
            Winning: <strong>{winnerName}</strong>
          </span>
        )}
      </div>
    </div>
  )
}
