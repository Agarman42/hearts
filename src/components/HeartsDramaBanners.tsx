import './Table.css'

interface Props {
  drama: 'hearts' | 'queen' | null
  message: string | null
}

export function HeartsDramaBanners({ drama, message }: Props) {
  if (!drama || !message) return null

  if (drama === 'queen') {
    return (
      <div className="drama-banner drama-banner--queen" role="status">
        <div className="drama-banner__icon">♠</div>
        <div className="drama-banner__text">
          <span className="drama-banner__eyebrow">Queen of Spades · 13 pts</span>
          <span className="drama-banner__title">{message.replace(/^♠\s*/, '')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="drama-banner drama-banner--hearts" role="status">
      <div className="drama-banner__icon">♥</div>
      <div className="drama-banner__text">
        <span className="drama-banner__eyebrow">Hearts</span>
        <span className="drama-banner__title">Hearts are broken!</span>
      </div>
    </div>
  )
}