import { useMemo, type CSSProperties } from 'react'
import type { Card } from '../core/types'
import { GAMES, type GameId } from '../games/registry'
import { goalsCompletedCount, loadGoals } from '../goals'
import { loadAchievements, visibleAchievements } from '../achievements'
import { loadStats, winRate } from '../stats'
import { CardView } from './CardView'
import { PwaInstallTip } from './PwaInstallTip'
import './Home.css'

interface Props {
  saves: Partial<Record<GameId, boolean>>
  onPlayGame: (id: GameId) => void
  onContinueGame: (id: GameId) => void
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

const GAME_LABEL: Record<GameId, string> = {
  hearts: 'Hearts',
  spades: 'Spades',
  euchre: 'Euchre',
}

export function Home({ saves, onPlayGame, onContinueGame, onSettings, onStats }: Props) {
  const heartsStats = useMemo(() => loadStats('hearts'), [])
  const spadesStats = useMemo(() => loadStats('spades'), [])
  const goals = useMemo(() => loadGoals(), [])
  const unlocked = useMemo(() => loadAchievements(), [])
  const heartsRate = winRate(heartsStats)
  const spadesRate = winRate(spadesStats)
  const combinedWins = heartsStats.matchesWon + spadesStats.matchesWon
  const showStats =
    heartsStats.matchesPlayed > 0 ||
    heartsStats.handsPlayed > 0 ||
    spadesStats.matchesPlayed > 0
  const trophyCount = visibleAchievements(unlocked).filter((a) => unlocked[a.id]).length
  const goalsDone = goalsCompletedCount(goals)

  const continueGame = (['hearts', 'spades'] as GameId[]).find((id) => saves[id])

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
            <p className="home__kicker">Welcome to</p>
            <h1 id="home-title" className="home__title home__title--table" aria-label="Card Table">
              Card Table
            </h1>
            <p className="home__tagline">Hearts · Spades · more coming soon</p>
          </div>
        </div>

        <ul className="home__games" aria-label="Choose a game">
          {GAMES.map((game) => {
            const hasSave = Boolean(saves[game.id])
            return (
              <li key={game.id}>
                <button
                  type="button"
                  className={[
                    'home__game-tile',
                    game.available ? 'home__game-tile--active' : 'home__game-tile--soon',
                    hasSave ? 'home__game-tile--saved' : '',
                  ].join(' ')}
                  disabled={!game.available}
                  onClick={() => {
                    if (!game.available) return
                    if (hasSave) onContinueGame(game.id)
                    else onPlayGame(game.id)
                  }}
                >
                  <span className="home__game-icon" aria-hidden>
                    {game.icon}
                  </span>
                  <span className="home__game-name">{game.title}</span>
                  <span className="home__game-sub">{game.subtitle}</span>
                  {hasSave && game.available && (
                    <span className="home__game-save">Continue</span>
                  )}
                  {!game.available && <span className="home__game-soon">Soon</span>}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="home__rail">
          {(showStats || onStats) && (
            <div className="home__stats" aria-label="Career snapshot">
              {showStats && (
                <>
                  <span className="home__stat">
                    <strong>{combinedWins}</strong> wins
                  </span>
                  {heartsStats.matchesPlayed > 0 && (
                    <>
                      <span className="home__stat-sep" aria-hidden>
                        ·
                      </span>
                      <span className="home__stat">
                        ♥ <strong>{heartsRate ?? '—'}%</strong>
                      </span>
                    </>
                  )}
                  {spadesStats.matchesPlayed > 0 && (
                    <>
                      <span className="home__stat-sep" aria-hidden>
                        ·
                      </span>
                      <span className="home__stat">
                        ♠ <strong>{spadesRate ?? '—'}%</strong>
                      </span>
                    </>
                  )}
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
            {continueGame ? (
              <>
                <button
                  type="button"
                  className="btn btn--lg home__btn home__btn--deal"
                  onClick={() => onContinueGame(continueGame)}
                >
                  <span className="home__btn-shine" aria-hidden />
                  Continue {GAME_LABEL[continueGame]}
                  <span className="home__btn-arrow" aria-hidden>
                    →
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn--lg home__btn home__btn--ghost"
                  onClick={() => onPlayGame(continueGame)}
                >
                  New {GAME_LABEL[continueGame]} game
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--lg home__btn home__btn--deal"
                onClick={() => onPlayGame('hearts')}
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