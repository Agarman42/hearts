import type { Suit } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import './EuchreTrumpPanel.css'

interface Props {
  trump: Suit
  makerName?: string | null
  compact?: boolean
  loud?: boolean
}

export function EuchreTrumpChip({ trump, makerName, compact = false, loud = false }: Props) {
  const sym = SUIT_SYMBOL[trump]
  const red = trump === 'hearts' || trump === 'diamonds'
  return (
    <div
      className={[
        'euchre-trump-chip',
        compact ? 'euchre-trump-chip--compact' : '',
        loud ? 'euchre-trump-chip--loud' : '',
        red ? 'euchre-trump-chip--red' : 'euchre-trump-chip--black',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`Trump is ${trump}${makerName ? `, ordered by ${makerName}` : ''}`}
    >
      <span className="euchre-trump-chip__label">Trump</span>
      <span className="euchre-trump-chip__suit" aria-hidden>
        {sym}
      </span>
      {makerName && !compact && (
        <span className="euchre-trump-chip__maker">{makerName} ordered</span>
      )}
    </div>
  )
}