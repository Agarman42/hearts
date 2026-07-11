import { useMemo, type CSSProperties } from 'react'
import { loadStats, winRate } from '../stats'
import { PwaInstallTip } from './PwaInstallTip'
import './Home.css'

interface Props {
  onPlay: () => void
  onContinue?: () => void
  hasSave?: boolean
  onSettings: () => void
}

const FAN = [
  { rank: 'A', suit: '♠', red: false, rot: -28, lift: 0 },
  { rank: 'K', suit: '♥', red: true, rot: -14, lift: 4 },
  { rank: 'Q', suit: '♠', red: false, rot: 0, lift: 8 },
  { rank: '2', suit: '♣', red: false, rot: 14, lift: 4 },
  { rank: '10', suit: '♦', red: true, rot: 28, lift: 0 },
] as const

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
      <div className="home__sky" aria-hidden />
      <div className="home__rays" aria-hidden />
      <div className="home__vignette" aria-hidden />
      <div className="home__grain" aria-hidden />

      <div className="home__content">
        <section className="home__showcase" aria-labelledby="home-title">
          <div className="home__frame">
            <div className="home__frame-corner home__frame-corner--tl" aria-hidden />
            <div className="home__frame-corner home__frame-corner--tr" aria-hidden />
            <div className="home__frame-corner home__frame-corner--bl" aria-hidden />
            <div className="home__frame-corner home__frame-corner--br" aria-hidden />

            <div className="home__table" aria-hidden>
              <div className="home__table-felt" />
              <div className="home__table-ring" />
              <div className="home__fan">
                {FAN.map((c) => (
                  <div
                    key={`${c.rank}${c.suit}`}
                    className={`home__fan-card ${c.red ? 'home__fan-card--red' : ''}`}
                    style={
                      {
                        ['--rot']: `${c.rot}deg`,
                        ['--lift']: `${c.lift}px`,
                      } as CSSProperties
                    }
                  >
                    <span className="home__fan-rank">{c.rank}</span>
                    <span className="home__fan-suit">{c.suit}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="home__pre">
              <span className="home__pre-dot" aria-hidden />
              Solo table · 1 vs 3 AI
            </p>

            <h1 id="home-title" className="home__title" aria-label="Hearts">
              <span className="home__title-ghost" aria-hidden>
                Hearts
              </span>
              <span className="home__title-stack">
                <span className="home__title-kicker">The game of</span>
                <span className="home__title-main">
                  <span className="home__title-h">H</span>
                  <span className="home__title-heart" aria-hidden>
                    ♥
                  </span>
                  <span className="home__title-rest">earts</span>
                </span>
              </span>
            </h1>

            <p className="home__tagline">
              Velvet felt. Vivid cards. Ruthless AI.
              <span className="home__tagline-em">
                The slickest Hearts on your phone.
              </span>
            </p>

            <div className="home__jewels" aria-hidden>
              <span className="home__jewel home__jewel--h">♥</span>
              <span className="home__jewel">♠</span>
              <span className="home__jewel home__jewel--d">♦</span>
              <span className="home__jewel">♣</span>
            </div>
          </div>
        </section>

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

        <div className="home__dock">
          <PwaInstallTip />

          <div className="home__actions">
            {hasSave && onContinue ? (
              <>
                <button
                  type="button"
                  className="btn btn--lg home__btn home__btn--deal"
                  onClick={onContinue}
                >
                  <span className="home__btn-shine" aria-hidden />
                  <span className="home__btn-chip" aria-hidden>
                    ♠
                  </span>
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
                <span className="home__btn-chip" aria-hidden>
                  ♥
                </span>
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
    </div>
  )
}