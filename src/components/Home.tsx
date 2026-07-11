import { useMemo } from 'react'
import { loadStats, winRate } from '../stats'
import { PwaInstallTip } from './PwaInstallTip'
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
  const stats = useMemo(() => loadStats(), [])
  const rate = winRate(stats)
  const showStats = stats.matchesPlayed > 0 || stats.handsPlayed > 0

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

            <h1 className="home__title" aria-label="Hearts">
              <span className="home__title-glow" aria-hidden />
              <span className="home__title-word">
                <span className="home__title-letter">H</span>
                <span className="home__title-heart" aria-hidden>
                  ♥
                </span>
                <span className="home__title-letter">earts</span>
              </span>
            </h1>

            <p className="home__tagline">
              Velvet felt. Vivid cards. Ruthless AI.
              <br />
              <span className="home__tagline-em">The slickest Hearts on your phone.</span>
            </p>
          </div>
        </div>

        <PwaInstallTip />

        {showStats && (
          <div className="home__stats" aria-label="Career stats">
            <div className="home__stat">
              <span className="home__stat-value">{stats.matchesWon}</span>
              <span className="home__stat-label">Wins</span>
            </div>
            <div className="home__stat">
              <span className="home__stat-value">
                {rate != null ? `${rate}%` : '—'}
              </span>
              <span className="home__stat-label">Win rate</span>
            </div>
            <div className="home__stat">
              <span className="home__stat-value">{stats.moonsShot}</span>
              <span className="home__stat-label">Moons</span>
            </div>
            <div className="home__stat">
              <span className="home__stat-value">
                {stats.bestWinScore != null ? stats.bestWinScore : '—'}
              </span>
              <span className="home__stat-label">Best win</span>
            </div>
          </div>
        )}

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
            className="btn btn--lg home__btn home__btn--ghost home__btn--settings"
            onClick={onSettings}
          >
            <span className="home__btn-settings-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <path
                  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <path
                  d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.5.8.84 1.55.9H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.1Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
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
