import './Table.css'

type DramaKind = 'trump' | 'march' | 'euchre' | 'stick' | 'loner'

interface Props {
  drama: DramaKind | null
  message: string | null
  subtitle?: string | null
  centered?: boolean
}

export function EuchreDramaBanners({ drama, message, subtitle, centered }: Props) {
  if (!drama || !message) return null

  if (drama === 'march') {
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
        <div className="drama-banner__icon">5</div>
        <div className="drama-banner__text">
          <span className="drama-banner__eyebrow">March</span>
          <span className="drama-banner__title">{message}</span>
          {subtitle && <span className="drama-banner__sub">{subtitle}</span>}
        </div>
      </div>
    )
  }

  if (drama === 'euchre') {
    return (
      <div className="drama-banner drama-banner--hearts" role="status">
        <div className="drama-banner__icon">✗</div>
        <div className="drama-banner__text">
          <span className="drama-banner__eyebrow">Euchre</span>
          <span className="drama-banner__title">{message}</span>
        </div>
      </div>
    )
  }

  if (drama === 'loner') {
    return (
      <div className="drama-banner drama-banner--bids" role="status">
        <div className="drama-banner__icon">1</div>
        <div className="drama-banner__text">
          <span className="drama-banner__eyebrow">Loner</span>
          <span className="drama-banner__title">{message}</span>
        </div>
      </div>
    )
  }

  if (drama === 'stick') {
    return (
      <div className="drama-banner drama-banner--queen" role="status">
        <div className="drama-banner__icon">D</div>
        <div className="drama-banner__text">
          <span className="drama-banner__eyebrow">Stick the dealer</span>
          <span className="drama-banner__title">{message}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={[
        'drama-banner',
        'drama-banner--hearts',
        centered ? 'drama-banner--center' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
    >
      <div className="drama-banner__icon">♦</div>
      <div className="drama-banner__text">
        <span className="drama-banner__eyebrow">Trump</span>
        <span className="drama-banner__title">{message}</span>
        {subtitle && <span className="drama-banner__sub">{subtitle}</span>}
      </div>
    </div>
  )
}