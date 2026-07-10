import { Card } from '../core/types'
import { CardView } from './CardView'
import './PassTray.css'

interface Props {
  selected: Card[]
  passCount: number
  direction: string
  handNumber?: number
  /** Reviewing cards just received from another player */
  receiving?: boolean
  receivedFromName?: string
  onConfirm: () => void
  onRemove?: (card: Card) => void
  nextSlotIndex?: number
}

const DIR_PHRASE: Record<string, string> = {
  left: 'left',
  right: 'right',
  across: 'across',
  hold: 'hold',
}

const DIR_BUTTON: Record<string, string> = {
  left: 'Pass Left',
  right: 'Pass Right',
  across: 'Pass Across',
  hold: 'Hold',
}

const DIR_CHEVRON: Record<string, string> = {
  left: '← ← ←',
  right: '→ → →',
  across: '↕ ↕',
  hold: '· · ·',
}

export function PassTray({
  selected,
  passCount,
  direction,
  handNumber,
  receiving,
  receivedFromName,
  onConfirm,
  onRemove,
  nextSlotIndex,
}: Props) {
  const ready = selected.length === passCount
  const slots = Array.from({ length: passCount }, (_, i) => selected[i] ?? null)
  const dirKey = direction in DIR_PHRASE ? direction : 'left'

  return (
    <div
      className={[
        'pass-ui',
        ready || receiving ? 'pass-ui--ready' : '',
        receiving ? 'pass-ui--receiving' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {handNumber != null && handNumber > 0 && (
        <div className="pass-ui__round">
          <span className="pass-ui__round-label">Hand</span>
          <span className="pass-ui__round-num">{handNumber}</span>
        </div>
      )}

      <div className={`pass-ui__banner ${receiving ? 'pass-ui__banner--receive' : ''}`}>
        {receiving
          ? receivedFromName
            ? `Received from ${receivedFromName} (your ${
                dirKey === 'right' ? 'left' : dirKey === 'left' ? 'right' : 'partner'
              })`
            : 'Cards you received'
          : `Pass ${passCount} cards ${DIR_PHRASE[dirKey]}`}
      </div>

      {!receiving && dirKey !== 'hold' && (
        <div className={`pass-ui__chevrons pass-ui__chevrons--${dirKey}`} aria-hidden>
          <span>{DIR_CHEVRON[dirKey]}</span>
        </div>
      )}

      <div
        className="pass-ui__slots"
        aria-label={receiving ? 'Cards you received' : 'Cards selected to pass'}
      >
        {slots.map((card, i) => (
          <button
            key={card ? card.id : `empty-${i}`}
            type="button"
            data-pass-slot={i}
            className={[
              'pass-ui__slot',
              card ? 'is-filled' : 'is-empty',
              !card && !receiving && nextSlotIndex === i ? 'is-target' : '',
              receiving && card ? 'is-received' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => !receiving && card && onRemove?.(card)}
            aria-label={
              card
                ? receiving
                  ? `${card.rank} of ${card.suit}`
                  : `Remove ${card.rank} of ${card.suit}`
                : `Empty slot ${i + 1}`
            }
            disabled={!card || receiving}
          >
            {card ? <CardView card={card} size="slot" /> : null}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`pass-ui__cta ${ready || receiving ? 'is-ready' : ''} ${
          receiving ? 'pass-ui__cta--receive' : ''
        }`}
        disabled={!receiving && !ready}
        onClick={onConfirm}
      >
        {receiving ? 'Add to hand' : DIR_BUTTON[dirKey]}
      </button>
    </div>
  )
}
