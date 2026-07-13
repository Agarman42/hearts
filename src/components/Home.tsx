import { useMemo, type CSSProperties } from 'react'
import type { Card } from '../core/types'
import { GAMES } from '../games/registry'
import { goalsCompletedCount, loadGoals } from '../goals'
import { loadAchievements, visibleAchievements } from '../achievements'
import { loadStats, winRate } from '../stats'
import { CardView } from './CardView'
import { PwaInstallTip } from './PwaInstallTip'
import './Home.css'

interface Props {
  onPlay: () => void
  onContinue?: () => void
  hasSave?: boolean
  onSettings: () => void
  onStats?: () => void
}

const FAN_CARDS: readonly Card[] = [
  { id: 'home-c2', suit: 'clubs', rank: '2' },
  { id: 'home-d10', suit: 'diamonds', rank: '10' },
  { id: 'home-qs', suit: 'spades', rank: 'Q' },
  { id: 'home-kh', suit: 'hearts', rank: 'K' },
  { id: 'home-ah', suit: 'hearts', rank: 'A' },
]

export function Home({ onPlay, onContinue, hasSave, onSettings, onStats }: Props) {
  const stats = useMemo(() => loadStats(), [])
  const goals = useMemo(() => loadGoals(), [])
  const unlocked = useMemo(() => loadAchievements(), [])
  const rate = winRate(stats)
  const showStats = stats.matchesPlayed > 0 || stats.handsPlayed > 0
  const trophyCount = visibleAchievements(unlocked).filter((a) => unlocked[a.id]).length
  const goalsDone = goalsCompletedCount(goals)

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
            <p className="home__kicker">Card Table</p>
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

        <ul className="home__games" aria-label="Choose a game">
          {GAMES.map((game) => (
            <li key={game.id}>
              <button
                type="button"
                className={[
                  'home__game-tile',
                  game.available ? 'home__game-tile--active' : 'home__game-tile--soon',
                ].join(' ')}
                disabled={!game.available}
                onClick={game.available ? onPlay : undefined}
              >
                <span className="home__game-icon" aria-hidden>
                  {game.icon}
                </span>
                <span className="home__game-name">{game.title}</span>
                <span className="home__game-sub">{game.subtitle}</span>
                {!game.available && <span className="home__game-soon">Soon</span>}
              </button>
            </li>
          ))}
        </ul>

        <div className="home__rail">
          {(showStats || onStats) && (
            <div className="home__stats" aria-label="Career snapshot">
              {showStats && (
                <>
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
                </>
              )}
              {onStats && (
                <>
                  {showStats && (
                    <span className="home__stat-sep" aria-hidden>
                      ·
                    </span>
                  )}
                  <span className="home__stat">
                    <strong>{trophyCount}</strong> trophies · <strong>{goalsDone}</strong> goals
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
                  Continue Hearts
                  <span className="home__btn-arrow" aria-hidden>
                    →
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn--lg home__btn home__btn--ghost"
                  onClick={onPlay}
                >
                  New Hearts game
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--lg home__btn home__btn--deal"
                onClick={onPlay}
              >
                <span className="home__btn-shine" aria-hidden />
                Deal Hearts
                <span className="home__btn-arrow" aria-hidden>
                  →
                </span>
              </button>
            )}
            {onStats && (
              <button
                type="button"
                className="btn home__btn home__btn--ghost"
                onClick={onStats}
              >
                Stats · Goals · Trophies
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