import { Rank, Suit, SUIT_SYMBOL } from '../core/types'
import './PipLayout.css'

interface Props {
  suit: Suit
  rank: Rank
}

/**
 * French-deck style face: large corners carry rank + suit;
 * center is a single crisp suit pip for EVERY rank (including J/Q/K).
 * No second letter in the middle — that read as a cheap “fake face card.”
 */
export function PipLayout({ suit, rank }: Props) {
  const sym = SUIT_SYMBOL[suit]
  const isAce = rank === 'A'
  const isCourt = rank === 'J' || rank === 'Q' || rank === 'K'

  return (
    <div
      className={[
        'face-center',
        'face-center--pip',
        isAce ? 'face-center--ace' : '',
        isCourt ? 'face-center--court-pip' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="face-center__suit-mega" aria-hidden>
        {sym}
      </span>
    </div>
  )
}
