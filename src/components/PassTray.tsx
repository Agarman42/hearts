import { useId } from 'react'
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

function ArrowDefs({ gradId }: { gradId: string }) {
  return (
    <defs>
      <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff9c4" />
        <stop offset="40%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </defs>
  )
}

function DirArrows({ dir }: { dir: string }) {
  const gradId = useId().replace(/:/g, '')

  if (dir === 'hold') {
    return (
      <div className="pass-ui__arrows pass-ui__arrows--hold" aria-hidden>
        <span className="pass-ui__hold-badge">No pass</span>
      </div>
    )
  }

  const label =
    dir === 'across' ? 'Across' : dir === 'right' ? 'Right' : 'Left'

  return (
    <div className={`pass-ui__arrows pass-ui__arrows--${dir}`} aria-hidden>
      <div className="pass-ui__arrow-lane">
        <span className="pass-ui__arrow-flow" />
        <svg
          viewBox={dir === 'across' ? '0 0 48 88' : '0 0 128 40'}
          className={`pass-ui__arrow-svg ${
            dir === 'across' ? '' : 'pass-ui__arrow-svg--wide'
          }`}
        >
          <ArrowDefs gradId={gradId} />
          {dir === 'across' ? (
            <>
              <path
                className="pass-ui__arrow-shaft"
                d="M24 68V22"
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                className="pass-ui__arrow-head pass-ui__arrow-head--1"
                d="M24 12 L14 26 L24 20 L34 26 Z"
                fill={`url(#${gradId})`}
              />
              <path
                className="pass-ui__arrow-head pass-ui__arrow-head--2"
                d="M24 28 L14 42 L24 36 L34 42 Z"
                fill={`url(#${gradId})`}
              />
              <path
                className="pass-ui__arrow-head pass-ui__arrow-head--3"
                d="M24 44 L14 58 L24 52 L34 58 Z"
                fill={`url(#${gradId})`}
              />
            </>
          ) : dir === 'right' ? (
            <>
              <path
                className="pass-ui__arrow-shaft"
                d="M8 20h72"
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                className="pass-ui__arrow-head pass-ui__arrow-head--1"
                d="M88 20 L72 8 v24 Z"
                fill={`url(#${gradId})`}
              />
              <path
                className="pass-ui__arrow-head pass-ui__arrow-head--2"
                d="M102 20 L86 8 v24 Z"
                fill={`url(#${gradId})`}
              />
              <path
                className="pass-ui__arrow-head pass-ui__arrow-head--3"
                d="M116 20 L100 8 v24 Z"
                fill={`url(#${gradId})`}
              />
            </>
          ) : (
            <>
              <path
                className="pass-ui__arrow-shaft"
                d="M120 20H48"
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                className="pass-ui__arrow-head pass-ui__arrow-head--1"
                d="M40 20 L56 8 v24 Z"
                fill={`url(#${gradId})`}
              />
              <path
                className="pass-ui__arrow-head pass-ui__arrow-head--2"
                d="M26 20 L42 8 v24 Z"
                fill={`url(#${gradId})`}
              />
              <path
                className="pass-ui__arrow-head pass-ui__arrow-head--3"
                d="M12 20 L28 8 v24 Z"
                fill={`url(#${gradId})`}
              />
            </>
          )}
        </svg>
      </div>
      <span className="pass-ui__arrow-label">{label}</span>
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

  const receiveBanner = (() => {
    if (!receivedFromName) return 'Cards you received'
    if (dirKey === 'across') return `From ${receivedFromName} · across`
    if (dirKey === 'right') return `From ${receivedFromName} · on your left`
    if (dirKey === 'left') return `From ${receivedFromName} · on your right`
    return `From ${receivedFromName}`
  })()

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
          ? receiveBanner
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
