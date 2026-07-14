import { useMemo } from 'react'
import type { Card } from '../core/types'
import { GAMES, gameMeta, type GameId } from '../games/registry'
import { getLatestSave } from '../gameSave'
import { dailyGoalChips, goalsCompletedAllGames } from '../goals'
import { loadAchievements, visibleAchievements } from '../achievements'
import { loadEuchreAchievements, visibleEuchreAchievements } from '../achievements/euchre'
import { loadSpadesAchievements, visibleSpadesAchievements } from '../achievements/spades'
import { loadPrefs } from '../prefs'
import { loadTrophyCase, visibleTrophies } from '../trophyCase'
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

const TABLEAU_CARDS: readonly { card: Card; slot: string }[] = [
  { card: { id: 'tb-kc', suit: 'clubs', rank: 'K' }, slot: 'l2' },
  { card: { id: 'tb-qh', suit: 'hearts', rank: 'Q' }, slot: 'l1' },
  { card: { id: 'tb-as', suit: 'spades', rank: 'A' }, slot: 'c' },
  { card: { id: 'tb-jd', suit: 'diamonds', rank: 'J' }, slot: 'r1' },
  { card: { id: 'tb-th', suit: 'hearts', rank: '10' }, slot: 'r2' },
]

const GAME_ACCENT: Record<GameId, string> = {
  hearts: '♥',
  spades: '♠',
  euchre: '♦',
}

export function Home({ saves, onPlayGame, onContinueGame, onSettings, onStats }: Props) {
  const heartsStats = useMemo(() => loadStats('hearts'), [])
  const spadesStats = useMemo(() => loadStats('spades'), [])
  const euchreStats = useMemo(() => loadStats('euchre'), [])
  const defaultGame = useMemo(() => loadPrefs().activeGameId ?? 'hearts', [])
  const heartsUnlocked = useMemo(() => loadAchievements('hearts'), [])
  const spadesUnlocked = useMemo(() => loadSpadesAchievements(), [])
  const euchreUnlocked = useMemo(() => loadEuchreAchievements(), [])
  const globalTrophies = useMemo(() => loadTrophyCase(), [])
  const heartsRate = winRate(heartsStats)
  const spadesRate = winRate(spadesStats)
  const euchreRate = winRate(euchreStats)
  const combinedWins =
    heartsStats.matchesWon + spadesStats.matchesWon + euchreStats.matchesWon
  const showStats =
    heartsStats.matchesPlayed > 0 ||
    heartsStats.handsPlayed > 0 ||
    spadesStats.matchesPlayed > 0 ||
    euchreStats.matchesPlayed > 0
  const gameTrophyCount =
    visibleAchievements(heartsUnlocked).filter((a) => heartsUnlocked[a.id]).length +
    visibleSpadesAchievements(spadesUnlocked).filter((a) => spadesUnlocked[a.id]).length +
    visibleEuchreAchievements(euchreUnlocked).filter((a) => euchreUnlocked[a.id]).length
  const globalTrophyCount = visibleTrophies(globalTrophies).filter(
    (t) => globalTrophies[t.id],
  ).length
  const trophyCount = gameTrophyCount + globalTrophyCount
  const goalsDone = goalsCompletedAllGames()
  const dailyGoals = useMemo(() => dailyGoalChips(), [])

  const latestSave = useMemo(
    () => getLatestSave(),
    [saves.hearts, saves.spades, saves.euchre],
  )
  const continueGame = latestSave?.gameId

  return (
    <div className="home">
      <div className="home__vignette" aria-hidden />
      <div className="home__lamp" aria-hidden />
      <div className="home__dust" aria-hidden />

      <main className="home__stage">
        <header className="home__hero" aria-labelledby="home-title">
          <div className="home__felt">
            <div className="home__felt-rim" aria-hidden />
            <div className="home__felt-noise" aria-hidden />
            <div className="home__felt-spotlight" aria-hidden />

            <div className="home__tableau" aria-hidden>
              <div className="home__tableau-shadow" />
              <div className="home__peek home__peek--left">
                <CardView card={TABLEAU_CARDS[0].card} faceDown size="hand" />
              </div>
              <div className="home__peek home__peek--right">
                <CardView card={TABLEAU_CARDS[4].card} faceDown size="hand" />
              </div>
              <div className="home__tableau-fan">
                {TABLEAU_CARDS.map(({ card, slot }) => (
                  <div
                    key={card.id}
                    className={['home__tableau-card', `home__tableau-card--${slot}`].join(' ')}
                  >
                    <CardView card={card} size="hand" />
                  </div>
                ))}
              </div>
            </div>

            <div className="home__chip-pile home__chip-pile--left" aria-hidden>
              <span className="home__chip home__chip--gold" />
              <span className="home__chip home__chip--red" />
            </div>
            <div className="home__chip-pile home__chip-pile--right" aria-hidden>
              <span className="home__chip home__chip--navy" />
              <span className="home__chip home__chip--gold" />
            </div>

            <div className="home__brand">
              <div className="home__brand-glow" aria-hidden />
              <p className="home__kicker">The card parlour</p>
              <h1 id="home-title" className="home__title" aria-label="Cutthroat">
                <span className="home__title-cut">Cut</span>
                <span className="home__title-throat">throat</span>
              </h1>
              <p className="home__tagline">
                <span className="home__tagline-suit">♥</span>
                Hearts
                <span className="home__tagline-dot" aria-hidden>
                  ·
                </span>
                <span className="home__tagline-suit home__tagline-suit--dark">♠</span>
                Spades
                <span className="home__tagline-dot" aria-hidden>
                  ·
                </span>
                <span className="home__tagline-suit home__tagline-suit--red">♦</span>
                Euchre
              </p>
            </div>
          </div>
        </header>

        <ul className="home__games" aria-label="Choose a game">
          {GAMES.map((game) => {
            const hasSave = Boolean(saves[game.id])
            const isLatest = continueGame === game.id
            return (
              <li key={game.id}>
                <button
                  type="button"
                  className={[
                    'home__game-tile',
                    `home__game-tile--${game.id}`,
                    game.available ? '' : 'home__game-tile--soon',
                    hasSave ? 'home__game-tile--resume' : '',
                    isLatest ? 'home__game-tile--latest' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!game.available}
                  onClick={() => {
                    if (!game.available) return
                    if (hasSave) onContinueGame(game.id)
                    else onPlayGame(game.id)
                  }}
                >
                  <span className="home__game-plaque" aria-hidden>
                    <span className="home__game-plaque-icon">{GAME_ACCENT[game.id]}</span>
                  </span>
                  <span className="home__game-name">{game.title}</span>
                  <span className="home__game-sub">
                    {hasSave ? 'In progress' : game.subtitle}
                  </span>
                  {hasSave && (
                    <span className="home__game-resume-bar" aria-hidden />
                  )}
                  {!game.available && <span className="home__game-soon">Soon</span>}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="home__rail">
          {onStats && (
            <button
              type="button"
              className="home__career"
              onClick={onStats}
              aria-label="Career stats, trophies, and goals"
            >
              <span className="home__career-cell">
                <span className="home__career-icon" aria-hidden>
                  ✦
                </span>
                <strong className="home__career-num">{combinedWins}</strong>
                <span className="home__career-lbl">Wins</span>
              </span>
              <span className="home__career-divider" aria-hidden />
              <span className="home__career-cell">
                <span className="home__career-icon" aria-hidden>
                  🏆
                </span>
                <strong className="home__career-num">{trophyCount}</strong>
                <span className="home__career-lbl">Trophies</span>
              </span>
              <span className="home__career-divider" aria-hidden />
              <span className="home__career-cell">
                <span className="home__career-icon" aria-hidden>
                  ◎
                </span>
                <strong className="home__career-num">{goalsDone}</strong>
                <span className="home__career-lbl">Goals</span>
              </span>
              {showStats && (heartsStats.matchesPlayed > 0 ||
                spadesStats.matchesPlayed > 0 ||
                euchreStats.matchesPlayed > 0) && (
                <span className="home__career-rates">
                  {heartsStats.matchesPlayed > 0 && (
                    <span>
                      ♥ {heartsRate ?? '—'}%
                    </span>
                  )}
                  {spadesStats.matchesPlayed > 0 && (
                    <span>
                      ♠ {spadesRate ?? '—'}%
                    </span>
                  )}
                  {euchreStats.matchesPlayed > 0 && (
                    <span>
                      ♦ {euchreRate ?? '—'}%
                    </span>
                  )}
                </span>
              )}
            </button>
          )}

          {dailyGoals.length > 0 && onStats && (
            <ul className="home__daily-goals" aria-label="Today's goals">
              {dailyGoals.map((g) => (
                <li key={g.gameId}>
                  <button type="button" className="home__daily-goal" onClick={onStats}>
                    <span aria-hidden>{g.icon}</span>
                    <span className="home__daily-goal__title">{g.title}</span>
                    <span className="home__daily-goal__prog">
                      {g.current}/{g.target}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
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
                  Resume {gameMeta(continueGame).title}
                  <span className="home__btn-arrow" aria-hidden>
                    →
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn--lg home__btn home__btn--ghost"
                  onClick={() => onPlayGame(continueGame)}
                >
                  Fresh {gameMeta(continueGame).title} table
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn--lg home__btn home__btn--deal"
                  onClick={() => onPlayGame(defaultGame)}
                >
                  <span className="home__btn-shine" aria-hidden />
                  Deal {gameMeta(defaultGame).title}
                  <span className="home__btn-arrow" aria-hidden>
                    →
                  </span>
                </button>
                <div className="home__quick-deals" role="group" aria-label="Deal another game">
                  {GAMES.filter((g) => g.available && g.id !== defaultGame).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className="btn home__btn home__btn--ghost home__btn--quick"
                      onClick={() => onPlayGame(g.id)}
                    >
                      {GAME_ACCENT[g.id]} {g.title}
                    </button>
                  ))}
                </div>
              </>
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