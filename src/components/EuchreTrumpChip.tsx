import type { Suit } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import './EuchreTrumpPanel.css'

interface Props {
  trump: Suit
  makerName?: string | null
  compact?: boolean
}

export function EuchreTrumpChip({ trump, makerName, compact = false }: Props) {
  const sym = SUIT_SYMBOL[trump]
  return (
    <div
      className={['euchre-trump-chip', compact ? 'euchre-trump-chip--compact' : '']
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