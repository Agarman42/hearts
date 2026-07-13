import './Table.css'

interface Props {
  drama: 'spades' | 'nil' | null
  message: string | null
}

export function SpadesDramaBanners({ drama, message }: Props) {
  if (!drama || !message) return null

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
        <span className="drama-banner__title">Spades are broken!</span>
      </div>
    </div>
  )
}