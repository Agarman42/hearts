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
  hold: 'Keep your cards',
}

function DirArrows({ dir }: { dir: string }) {
  if (dir === 'hold') {
    return (
      <div className="pass-ui__arrows pass-ui__arrows--hold" aria-hidden>
        <span className="pass-ui__hold-badge">No pass</span>
      </div>
    )
  }
  if (dir === 'across') {
    return (
      <div className="pass-ui__arrows pass-ui__arrows--across" aria-hidden>
        <svg viewBox="0 0 48 48" className="pass-ui__arrow-svg">
          <path
            d="M24 8v32M24 8l-6 7M24 8l6 7M24 40l-6-7M24 40l6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="pass-ui__arrow-label">Across</span>
      </div>
    )
  }
  const right = dir === 'right'
  return (
    <div
      className={`pass-ui__arrows pass-ui__arrows--${right ? 'right' : 'left'}`}
      aria-hidden
    >
      <svg viewBox="0 0 72 28" className="pass-ui__arrow-svg pass-ui__arrow-svg--wide">
        {right ? (
          <path
            d="M6 14h52M48 6l12 8-12 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M66 14H14M24 6L12 14l12 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <span className="pass-ui__arrow-label">{right ? 'Right' : 'Left'}</span>
    </div>
  )
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
  const sideWord =
    dirKey === 'right' ? 'left' : dirKey === 'left' ? 'right' : 'partner'

  return (
    <div
      className={[
        'pass-ui',
        ready || receiving ? 'pass-ui--ready' : '',
        receiving ? 'pass-ui--receiving' : '',
        dirKey === 'hold' ? 'pass-ui--hold' : '',
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

      <div
        className={`pass-ui__banner ${receiving ? 'pass-ui__banner--receive' : ''} ${
          dirKey === 'hold' && !receiving ? 'pass-ui__banner--hold' : ''
        }`}
      >
        {receiving
          ? receivedFromName
            ? `From ${receivedFromName} · your ${sideWord}`
            : 'Cards you received'
          : dirKey === 'hold'
            ? 'Hold — no pass this hand'
            : `Pass ${passCount} ${DIR_PHRASE[dirKey]}`}
      </div>

      {!receiving && <DirArrows dir={dirKey} />}

      {dirKey !== 'hold' || receiving ? (
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
      ) : (
        <p className="pass-ui__hold-hint">Everyone keeps their dealt hand.</p>
      )}

      <button
        type="button"
        className={`pass-ui__cta ${ready || receiving || dirKey === 'hold' ? 'is-ready' : ''} ${
          receiving ? 'pass-ui__cta--receive' : ''
        }`}
        disabled={!receiving && dirKey !== 'hold' && !ready}
        onClick={onConfirm}
      >
        {receiving ? 'Add to hand' : DIR_BUTTON[dirKey]}
      </button>
    </div>
  )
}
