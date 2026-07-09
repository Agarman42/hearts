import type { CSSProperties } from 'react'
import { Card, SUIT_COLOR, SUIT_SYMBOL } from '../core/types'
import { PipLayout } from './PipLayout'
import './CardView.css'
import './PipLayout.css'

export type CardSize = 'hand' | 'trick' | 'slot' | 'mini'

interface Props {
  card: Card
  selected?: boolean
  disabled?: boolean
  dimmed?: boolean
  faceDown?: boolean
  compact?: boolean
  size?: CardSize
  winning?: boolean
  leading?: boolean
  style?: CSSProperties
  onClick?: (el: HTMLElement) => void
}

export function CardView({
  card,
  selected,
  disabled,
  dimmed,
  faceDown,
  compact,
  size,
  winning,
  leading,
  style,
  onClick,
}: Props) {
  const resolvedSize: CardSize = size ?? (compact ? 'mini' : 'hand')
  // Treat A/J/Q/K like the rest for layout — big corners + center suit only
  const isFace = card.rank === 'J' || card.rank === 'Q' || card.rank === 'K' || card.rank === 'A'

  if (faceDown) {
    return (
      <div
        className={`card card--back card--${resolvedSize}`}
        style={style}
        aria-hidden
      />
    )
  }

  const color = SUIT_COLOR[card.suit]
  const classes = [
    'card',
    `card--${color}`,
    `card--${resolvedSize}`,
    isFace ? 'card--face' : '',
    selected ? 'card--selected' : '',
    disabled ? 'card--disabled' : '',
    dimmed ? 'card--dimmed' : '',
    winning ? 'card--winning' : '',
    leading ? 'card--leading' : '',
    onClick ? 'card--clickable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      style={style}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation()
              onClick(e.currentTarget)
            }
          : undefined
      }
      disabled={disabled && !onClick}
      aria-label={`${card.rank} of ${card.suit}${winning ? ', currently winning' : ''}`}
    >
      <span className="card__corner card__corner--tl">
        <span className="card__rank">{card.rank}</span>
        <span className="card__suit">{SUIT_SYMBOL[card.suit]}</span>
      </span>

      <PipLayout suit={card.suit} rank={card.rank} />

      <span className="card__corner card__corner--br">
        <span className="card__rank">{card.rank}</span>
        <span className="card__suit">{SUIT_SYMBOL[card.suit]}</span>
      </span>

      {winning && <span className="card__winning-badge">WIN</span>}
    </button>
  )
}
