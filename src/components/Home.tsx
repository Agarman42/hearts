import { useCallback, useMemo, useState } from 'react'
import { GAMES, gameMeta, type GameId } from '../games/registry'
import { getLatestSave } from '../gameSave'
import { dailyGoalChips, goalsCompletedAllGames } from '../goals'
import { loadAchievements, visibleAchievements } from '../achievements'
import { loadEuchreAchievements, visibleEuchreAchievements } from '../achievements/euchre'
import { loadSpadesAchievements, visibleSpadesAchievements } from '../achievements/spades'
import { loadPrefs, resolveDefaultDealGame } from '../prefs'
import { loadTrophyCase, visibleTrophies } from '../trophyCase'
import { loadStats, recentMatchesAllGames, winRate } from '../stats'
import { APP_BUILD, APP_VERSION } from '../appVersion'
import { HomeCardFan } from './HomeCardFan'
import { PwaInstallTip } from './PwaInstallTip'
import { PwaUpdateTip } from './PwaUpdateTip'
import './Home.css'

interface Props {
  saves: Partial<Record<GameId, boolean>>
  homeEpoch?: number
  showCareerBar?: boolean
  showDailyChallenges?: boolean
  showRecentMatches?: boolean
  onPlayGame: (id: GameId) => void
  onContinueGame: (id: GameId) => void
  onSettings: () => void
  onStats?: () => void
}

const GAME_ACCENT: Record<GameId, string> = {
  hearts: '♥',
  spades: '♠',
  euchre: '♦',
}

export function Home({
  saves,
  homeEpoch = 0,
  showCareerBar = true,
  showDailyChallenges = true,
  showRecentMatches = true,
  onPlayGame,
  onContinueGame,
  onSettings,
  onStats,
}: Props) {
  const [pendingNewTable, setPendingNewTable] = useState<GameId | null>(null)

  const requestNewTable = useCallback(
    (gameId: GameId) => {
      if (saves[gameId]) setPendingNewTable(gameId)
      else onPlayGame(gameId)
    },
    [onPlayGame, saves],
  )

  const confirmNewTable = useCallback(() => {
    if (pendingNewTable) {
      onPlayGame(pendingNewTable)
      setPendingNewTable(null)
    }
  }, [onPlayGame, pendingNewTable])

  const heartsStats = useMemo(() => loadStats('hearts'), [homeEpoch])
  const spadesStats = useMemo(() => loadStats('spades'), [homeEpoch])
  const euchreStats = useMemo(() => loadStats('euchre'), [homeEpoch])
  const defaultGame = useMemo(() => resolveDefaultDealGame(loadPrefs()), [homeEpoch])
  const heartsUnlocked = useMemo(() => loadAchievements('hearts'), [homeEpoch])
  const spadesUnlocked = useMemo(() => loadSpadesAchievements(), [homeEpoch])
  const euchreUnlocked = useMemo(() => loadEuchreAchievements(), [homeEpoch])
  const globalTrophies = useMemo(() => loadTrophyCase(), [homeEpoch])
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
  const goalsDone = useMemo(() => goalsCompletedAllGames(), [homeEpoch])
  const dailyGoals = useMemo(() => dailyGoalChips(), [homeEpoch])
  const recentMatches = useMemo(() => recentMatchesAllGames(5), [homeEpoch])

  const formatMatchDate = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

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

            <div className="home__tableau">
              <HomeCardFan />
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
            const tileClass = [
              'home__game-tile',
              `home__game-tile--${game.id}`,
              game.available ? '' : 'home__game-tile--soon',
              hasSave ? 'home__game-tile--resume' : '',
              isLatest ? 'home__game-tile--latest' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <li key={game.id}>
                {hasSave ? (
                  <div
                    className={[
                      'home__game-stack',
                      isLatest ? 'home__game-stack--latest' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <button
                      type="button"
                      className={tileClass}
                      disabled={!game.available}
                      onClick={() => onContinueGame(game.id)}
                    >
                      <span className="home__game-plaque" aria-hidden>
                        <span className="home__game-plaque-icon">{GAME_ACCENT[game.id]}</span>
                      </span>
                      <span className="home__game-name">{game.title}</span>
                      <span className="home__game-sub">Resume</span>
                      <span className="home__game-resume-bar" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="home__game-new"
                      disabled={!game.available}
                      onClick={() => requestNewTable(game.id)}
                    >
                      New table
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={tileClass}
                    disabled={!game.available}
                    onClick={() => requestNewTable(game.id)}
                  >
                    <span className="home__game-plaque" aria-hidden>
                      <span className="home__game-plaque-icon">{GAME_ACCENT[game.id]}</span>
                    </span>
                    <span className="home__game-name">{game.title}</span>
                    <span className="home__game-sub">{game.subtitle}</span>
                    {!game.available && <span className="home__game-soon">Soon</span>}
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <div className="home__rail">
          {onStats && showCareerBar && (
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

          {recentMatches.length > 0 && onStats && showRecentMatches && (
            <section className="home__recent" aria-labelledby="home-recent-title">
              <header className="home__recent-head">
                <h2 id="home-recent-title" className="home__recent-title">
                  Recent matches
                </h2>
                <p className="home__recent-sub">Latest results across all games</p>
              </header>
              <ul className="home__recent-list">
                {recentMatches.map((m) => {
                  const meta = gameMeta(m.gameId)
                  return (
                    <li key={`${m.gameId}-${m.at}`}>
                      <button
                        type="button"
                        className={[
                          'home__recent-row',
                          m.won ? 'home__recent-row--win' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={onStats}
                        aria-label={`${meta.title} ${m.won ? 'win' : 'loss'} on ${formatMatchDate(m.at)}. You scored ${m.yourScore}, winner ${m.winnerScore}. ${m.handsInMatch} hands.`}
                      >
                        <span className="home__recent-game" aria-hidden>
                          {meta.icon}
                        </span>
                        <span className="home__recent-body">
                          <span className="home__recent-kicker">
                            {meta.title} · {formatMatchDate(m.at)}
                          </span>
                          <span className="home__recent-score">
                            <span className="home__recent-result">{m.won ? 'Win' : 'Loss'}</span>
                            {' · '}
                            You {m.yourScore} · winner {m.winnerScore}
                          </span>
                          <span className="home__recent-meta">
                            {m.handsInMatch} hand{m.handsInMatch === 1 ? '' : 's'}
                            {m.gameId === 'hearts' && m.moonsShot > 0 && ` · ${m.moonsShot} moon`}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {dailyGoals.length > 0 && onStats && showDailyChallenges && (
            <section className="home__challenges" aria-labelledby="home-challenges-title">
              <header className="home__challenges-head">
                <h2 id="home-challenges-title" className="home__challenges-title">
                  Today&apos;s challenges
                </h2>
                <p className="home__challenges-sub">
                  One daily goal per game · resets at midnight
                </p>
              </header>
              <ul className="home__daily-goals">
                {dailyGoals.map((g) => {
                  const meta = gameMeta(g.gameId)
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        className="home__daily-goal"
                        onClick={onStats}
                        aria-label={`${meta.title} daily challenge: ${g.title}. ${g.description} Progress ${g.current} of ${g.target}.`}
                      >
                        <span className="home__daily-goal__game" aria-hidden>
                          {meta.icon}
                        </span>
                        <span className="home__daily-goal__body">
                          <span className="home__daily-goal__kicker">
                            {meta.title} · Daily
                          </span>
                          <span className="home__daily-goal__title">
                            <span className="home__daily-goal__badge" aria-hidden>
                              {g.icon}
                            </span>
                            {g.title}
                          </span>
                          <span className="home__daily-goal__desc">{g.description}</span>
                        </span>
                        <span className="home__daily-goal__prog">
                          {g.current}/{g.target}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <PwaUpdateTip />
          <PwaInstallTip />

          <div className="home__actions">
            <button
              type="button"
              className="btn btn--lg home__btn home__btn--deal"
              onClick={() => requestNewTable(defaultGame)}
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
                  onClick={() => requestNewTable(g.id)}
                >
                  {GAME_ACCENT[g.id]} {g.title}
                </button>
              ))}
            </div>
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

          <p className="home__version" aria-label={`Version ${APP_VERSION}, build ${APP_BUILD}`}>
            v{APP_VERSION} · build {APP_BUILD}
          </p>
        </div>
      </main>

      {pendingNewTable && (
        <div className="home-confirm" role="dialog" aria-labelledby="home-confirm-title">
          <button
            type="button"
            className="home-confirm__backdrop"
            aria-label="Dismiss dialog"
            onClick={() => setPendingNewTable(null)}
          />
          <div className="home-confirm__card">
            <p className="home-confirm__eyebrow">In-progress match</p>
            <h2 id="home-confirm-title" className="home-confirm__title">
              Start a new {gameMeta(pendingNewTable).title} table?
            </h2>
            <p className="home-confirm__sub">
              Your saved match will be discarded. Career stats and achievements are kept.
            </p>
            <div className="home-confirm__actions">
              <button
                type="button"
                className="btn btn--ghost btn--lg"
                onClick={() => setPendingNewTable(null)}
              >
                Cancel
              </button>
              <button type="button" className="btn btn--primary btn--lg" onClick={confirmNewTable}>
                New table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}