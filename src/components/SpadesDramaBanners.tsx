import type { Seat } from '../core/types'
import type { PartnershipId } from '../core/partnership'
import { teamLabel } from '../games/spades/labels'
import './Table.css'
import './SpadesTable.css'

type DramaKind = 'spades' | 'nil' | 'bids' | 'set' | 'bag'

export interface SpadesBidRecap {
  tableBooks: number
  teams: Record<PartnershipId, number>
  players: {
    seat: Seat
    name: string
    label: string
    team: PartnershipId
    isPartner: boolean
    isDealer: boolean
  }[]
}

interface Props {
  drama: DramaKind | null
  message: string | null
  subtitle?: string | null
  bidRecap?: SpadesBidRecap | null
  /** Pass-and-play: manual dismiss for bid recap. */
  onDismiss?: () => void
  /** Overlay on the trick area instead of the top strip. */
  centered?: boolean
}

export function SpadesDramaBanners({
  drama,
  message,
  subtitle,
  bidRecap,
  onDismiss,
  centered,
}: Props) {
  if (!drama || !message) return null

  if (drama === 'bids' && bidRecap) {
    return (
      <div
        className={[
          'drama-banner',
          'drama-banner--bids',
          'drama-banner--bids-recap',
          centered ? 'drama-banner--center' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role={onDismiss ? 'dialog' : 'status'}
        aria-modal={onDismiss ? true : undefined}
        aria-label="Final bids"
      >
        <div className="spades-bid-recap">
          <p className="spades-bid-recap__eyebrow">Bids locked in</p>
          <div className="spades-bid-recap__teams">
            {(['ns', 'ew'] as const).map((team) => (
              <div key={team} className="spades-bid-recap__team">
                <span className="spades-bid-recap__team-label">{teamLabel(team)}</span>
                <strong className="spades-bid-recap__team-total">{bidRecap.teams[team]}</strong>
              </div>
            ))}
          </div>
          <div className="spades-bid-recap__grid" aria-label="Player bids">
            {bidRecap.players.map((p) => (
              <div
                key={p.seat}
                className={[
                  'spades-bid-recap__cell',
                  p.isPartner ? 'spades-bid-recap__cell--partner' : '',
                  p.isDealer ? 'spades-bid-recap__cell--dealer' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="spades-bid-recap__name">
                  {p.isDealer && <span className="spades-bid-recap__dealer">D</span>}
                  {p.name}
                </span>
                <span className="spades-bid-recap__val">{p.label}</span>
              </div>
            ))}
          </div>
          <p className="spades-bid-recap__books">
            {bidRecap.tableBooks} book{bidRecap.tableBooks === 1 ? '' : 's'} on the table
          </p>
          {onDismiss && (
            <button
              type="button"
              className="btn btn--primary spades-bid-recap__ready"
              onClick={onDismiss}
              autoFocus
            >
              Ready to play
            </button>
          )}
        </div>
      </div>
    )
  }

  if (drama === 'bids') {
    return (
      <div
        className={[
          'drama-banner',
          'drama-banner--bids',
          centered ? 'drama-banner--center' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="status"
      >
        <div className="drama-banner__icon">Σ</div>
        <div className="drama-banner__text">
          <span className="drama-banner__eyebrow">Bids in</span>
          <span className="drama-banner__title">{message}</span>
          {subtitle && <span className="drama-banner__sub">{subtitle}</span>}
        </div>
      </div>
    )
  }

  if (drama === 'nil') {
    return (
      <div className="drama-banner drama-banner--queen drama-banner--celebrate" role="status">
        <div className="drama-banner__icon">∅</div>
        <div className="drama-banner__text">
          <span className="drama-banner__eyebrow">Nil</span>
          <span className="drama-banner__title">{message}</span>
        </div>
        {onDismiss && (
          <button
            type="button"
            className="btn btn--primary spades-bid-recap__ready"
            onClick={onDismiss}
          >
            Ready to continue
          </button>
        )}
      </div>
    )
  }

  if (drama === 'set') {
    return (
      <div className="drama-banner drama-banner--hearts drama-banner--celebrate" role="status">
        <div className="drama-banner__icon">✗</div>
        <div className="drama-banner__text">
          <span className="drama-banner__eyebrow">Set</span>
          <span className="drama-banner__title">{message}</span>
          {subtitle && <span className="drama-banner__sub">{subtitle}</span>}
        </div>
        {onDismiss && (
          <button
            type="button"
            className="btn btn--primary spades-bid-recap__ready"
            onClick={onDismiss}
          >
            Ready to continue
          </button>
        )}
      </div>
    )
  }

  if (drama === 'bag') {
    return (
      <div className="drama-banner drama-banner--queen drama-banner--celebrate" role="status">
        <div className="drama-banner__icon">🎒</div>
        <div className="drama-banner__text">
          <span className="drama-banner__eyebrow">Bags</span>
          <span className="drama-banner__title">{message}</span>
          {subtitle && <span className="drama-banner__sub">{subtitle}</span>}
        </div>
        {onDismiss && (
          <button
            type="button"
            className="btn btn--primary spades-bid-recap__ready"
            onClick={onDismiss}
          >
            Ready to continue
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="drama-banner drama-banner--hearts" role="status">
      <div className="drama-banner__icon">♠</div>
      <div className="drama-banner__text">
        <span className="drama-banner__eyebrow">Spades</span>
        <span className="drama-banner__title">{message}</span>
      </div>
    </div>
  )
}