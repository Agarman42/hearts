import './Table.css'
import './SpadesTable.css'

type DramaKind = 'spades' | 'nil' | 'bids'

interface Props {
  drama: DramaKind | null
  message: string | null
  subtitle?: string | null
  /** Overlay on the trick area instead of the top strip. */
  centered?: boolean
}

export function SpadesDramaBanners({ drama, message, subtitle, centered }: Props) {
  if (!drama || !message) return null

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
      <div className="drama-banner drama-banner--queen" role="status">
        <div className="drama-banner__icon">∅</div>
        <div className="drama-banner__text">
          <span className="drama-banner__eyebrow">Nil</span>
          <span className="drama-banner__title">{message}</span>
        </div>
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