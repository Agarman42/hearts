import './Home.css'

interface Props {
  onPlay: () => void
  onContinue?: () => void
  hasSave?: boolean
  onSettings: () => void
}

export function Home({ onPlay, onContinue, hasSave, onSettings }: Props) {
  return (
    <div className="home">
      <div className="home__glow home__glow--a" />
      <div className="home__glow home__glow--b" />

      <div className="home__hero">
        <div className="home__suits" aria-hidden>
          <span className="home__suit home__suit--r">♥</span>
          <span className="home__suit">♠</span>
          <span className="home__suit home__suit--r">♦</span>
          <span className="home__suit">♣</span>
        </div>
        <h1 className="home__title">Hearts</h1>
        <p className="home__tagline">
          Velvet table. Vivid cards. Ruthless AI.
          <br />
          The slickest Hearts on your phone.
        </p>
      </div>

      <div className="home__actions">
        {hasSave && onContinue ? (
          <>
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={onContinue}
            >
              Continue match
            </button>
            <button type="button" className="btn btn--ghost btn--lg" onClick={onPlay}>
              New game
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--primary btn--lg" onClick={onPlay}>
            Deal me in
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--lg" onClick={onSettings}>
          Settings
        </button>
      </div>

      <ul className="home__features">
        <li>Classic rules · race to 100</li>
        <li>Pass 3 · no points on first trick</li>
        <li>3 AI opponents · Easy / Med / Hard</li>
        <li>Progress saves if you step away</li>
      </ul>
    </div>
  )
}
