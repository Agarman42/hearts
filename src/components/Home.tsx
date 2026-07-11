import { useMemo, type CSSProperties } from 'react'
import type { Card } from '../core/types'
import { loadStats, winRate } from '../stats'
import { CardView } from './CardView'
import { PwaInstallTip } from './PwaInstallTip'
import './Home.css'

interface Props {
  onPlay: () => void
  onContinue?: () => void
  hasSave?: boolean
  onSettings: () => void
}

/** Decorative fan — Q♠ and A♥ bookend the danger cards. */
const FAN_CARDS: readonly Card[] = [
  { id: 'home-c2', suit: 'clubs', rank: '2' },
  { id: 'home-d10', suit: 'diamonds', rank: '10' },
  { id: 'home-qs', suit: 'spades', rank: 'Q' },
  { id: 'home-kh', suit: 'hearts', rank: 'K' },
  { id: 'home-ah', suit: 'hearts', rank: 'A' },
]

export function Home({ onPlay, onContinue, hasSave, onSettings }: Props) {
  const stats = useMemo(() => loadStats(), [])
  const rate = winRate(stats)
  const showStats = stats.matchesPlayed > 0 || stats.handsPlayed > 0

  return (
    <div className="home">
      <div className="home__vignette" aria-hidden />
      <div className="home__lamp" aria-hidden />

      <main className="home__stage">
        <div className="home__table" aria-labelledby="home-title">
          <div className="home__felt-texture" aria-hidden />
          <div className="home__felt-glow" aria-hidden />

          <div className="home__fan" aria-hidden>
            {FAN_CARDS.map((card, i) => (
              <div
                key={card.id}
                className="home__fan-card"
                style={{ '--fan-i': i } as CSSProperties}
              >
                <CardView card={card} size="hand" />
              </div>
            ))}
          </div>

          <div className="home__brand">
            <h1 id="home-title" className="home__title" aria-label="Hearts">
              <span className="home__title-word">H</span>
              <span className="home__title-heart" aria-hidden>
                ♥
              </span>
              <span className="home__title-word">earts</span>
            </h1>
            <p className="home__tagline">Race to 100 · Solo vs 3 AI</p>
          </div>
        </div>

        <div className="home__rail">
          {showStats && (
            <div className="home__stats" aria-label="Career stats">
              <span className="home__stat">
                <strong>{stats.matchesWon}</strong> wins
              </span>
              <span className="home__stat-sep" aria-hidden>
                ·
              </span>
              <span className="home__stat">
                <strong>{rate != null ? `${rate}%` : '—'}</strong> win rate
              </span>
              <span className="home__stat-sep" aria-hidden>
                ·
              </span>
              <span className="home__stat">
                <strong>{stats.moonsShot}</strong> moons
              </span>
              {stats.bestWinScore != null && (
                <>
                  <span className="home__stat-sep" aria-hidden>
                    ·
                  </span>
                  <span className="home__stat">
                    best <strong>{stats.bestWinScore}</strong>
                  </span>
                </>
              )}
            </div>
          )}

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
                  Continue match
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
                Deal me in
                <span className="home__btn-arrow" aria-hidden>
                  →
                </span>
              </button>
            )}
            <button
              type="button"
              className="btn home__btn home__btn--settings"
              onClick={onSettings}
              aria-label="Settings"
            >
              ⚙ Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}