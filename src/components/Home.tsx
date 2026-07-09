import './Home.css'

interface Props {
  onPlay: () => void
  onContinue?: () => void
  hasSave?: boolean
  onSettings: () => void
}

const FEATURES = [
  { icon: '♠', label: 'Classic rules', sub: 'Race to 100' },
  { icon: '↔', label: 'Pass three', sub: 'Left · right · across' },
  { icon: '◆', label: 'Sharp AI', sub: 'Easy · Med · Hard' },
  { icon: '◈', label: 'Autosave', sub: 'Pick up anytime' },
] as const

export function Home({ onPlay, onContinue, hasSave, onSettings }: Props) {
  return (
    <div className="home">
      {/* Ambient layers */}
      <div className="home__vignette" aria-hidden />
      <div className="home__glow home__glow--rose" aria-hidden />
      <div className="home__glow home__glow--gold" aria-hidden />
      <div className="home__glow home__glow--felt" aria-hidden />
      <div className="home__sparkles" aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="home__content">
        {/* Felt stage with floating mini-cards */}
        <div className="home__stage">
          <div className="home__felt" aria-hidden>
            <div className="home__felt-ring" />
            <div className="home__float-card home__float-card--a">
              <span className="home__float-rank">Q</span>
              <span className="home__float-suit home__float-suit--blk">♠</span>
            </div>
            <div className="home__float-card home__float-card--b">
              <span className="home__float-rank home__float-rank--red">A</span>
              <span className="home__float-suit home__float-suit--red">♥</span>
            </div>
            <div className="home__float-card home__float-card--c">
              <span className="home__float-rank home__float-rank--red">K</span>
              <span className="home__float-suit home__float-suit--red">♦</span>
            </div>
          </div>

          <div className="home__hero">
            <p className="home__eyebrow">
              <span className="home__eyebrow-dot" />
              Solo table · 1 vs 3 AI
            </p>

            <div className="home__suits" aria-hidden>
              <span className="home__suit home__suit--r">♥</span>
              <span className="home__suit">♠</span>
              <span className="home__suit home__suit--r">♦</span>
              <span className="home__suit">♣</span>
            </div>

            <h1 className="home__title">
              <span className="home__title-suit" aria-hidden>
                ♥
              </span>
              <span className="home__title-text">Hearts</span>
              <span className="home__title-suit home__title-suit--r" aria-hidden>
                ♥
              </span>
            </h1>

            <p className="home__tagline">
              Velvet felt. Vivid cards. Ruthless AI.
              <br />
              <span className="home__tagline-em">The slickest Hearts on your phone.</span>
            </p>
          </div>
        </div>

        <div className="home__actions">
          {hasSave && onContinue ? (
            <>
              <button
                type="button"
                className="btn btn--lg home__btn home__btn--deal"
                onClick={onContinue}
              >
                <span className="home__btn-shine" aria-hidden />
                <span className="home__btn-label">
                  <span className="home__btn-kicker">Saved match</span>
                  Continue
                </span>
                <span className="home__btn-arrow" aria-hidden>
                  →
                </span>
              </button>
              <button
                type="button"
                className="btn btn--lg home__btn home__btn--ghost"
                onClick={onPlay}
              >
                New game
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--lg home__btn home__btn--deal"
              onClick={onPlay}
            >
              <span className="home__btn-shine" aria-hidden />
              <span className="home__btn-label">
                <span className="home__btn-kicker">Ready when you are</span>
                Deal me in
              </span>
              <span className="home__btn-arrow" aria-hidden>
                →
              </span>
            </button>
          )}
          <button
            type="button"
            className="btn btn--lg home__btn home__btn--ghost"
            onClick={onSettings}
          >
            Settings
          </button>
        </div>

        <ul className="home__features">
          {FEATURES.map((f) => (
            <li key={f.label} className="home__feature">
              <span className="home__feature-icon" aria-hidden>
                {f.icon}
              </span>
              <span className="home__feature-text">
                <span className="home__feature-label">{f.label}</span>
                <span className="home__feature-sub">{f.sub}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="home__footer">
          Pass · Dump · Duck · <span>Shoot the moon</span>
        </p>
      </div>
    </div>
  )
}
