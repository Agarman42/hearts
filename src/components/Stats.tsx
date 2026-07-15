import { useMemo, useRef, useState } from 'react'
import {
  achievementProgress,
  loadAchievements,
  visibleAchievements,
} from '../achievements'
import {
  loadEuchreAchievements,
  euchreAchievementProgress,
  visibleEuchreAchievements,
} from '../achievements/euchre'
import {
  loadSpadesAchievements,
  spadesAchievementProgress,
  visibleSpadesAchievements,
} from '../achievements/spades'
import type { AvailableGameId } from '../games/registry'
import { gameMeta } from '../games/registry'
import { loadTrophyCase, trophyProgress, visibleTrophies } from '../trophyCase'
import { loadGoals } from '../goals'
import { achievementsKey, goalsKey } from '../storageKeys'
import {
  applyCareerImport,
  canShareCareerSummary,
  copyCareerExportToClipboard,
  copyCareerSummaryToClipboard,
  downloadCareerExport,
  parseCareerImport,
  shareCareerSummary,
  type CareerExport,
  type CareerImportMode,
} from '../careerExport'
import {
  avgPointsPerHand,
  cleanHandRate,
  loadStats,
  moonAgainstRate,
  moonShootRate,
  queenRate,
  resetStats,
  euchreEuchreRate,
  euchreLonerRate,
  euchreMarchRate,
  euchreOrderRate,
  spadesBagPenaltyRate,
  spadesNilRate,
  spadesTeamBidRate,
  winRate,
} from '../stats'
import './Stats.css'

interface Props {
  onBack: () => void
}

const STATS_GAMES: AvailableGameId[] = ['hearts', 'spades', 'euchre']

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function Stats({ onBack }: Props) {
  const [game, setGame] = useState<AvailableGameId>('hearts')
  const [confirmReset, setConfirmReset] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<{
    name: string
    data: CareerExport
    mode: CareerImportMode
  } | null>(null)
  const [rev, setRev] = useState(0)
  const importInputRef = useRef<HTMLInputElement>(null)
  const meta = gameMeta(game)

  const allStats = useMemo(
    () => ({
      hearts: loadStats('hearts'),
      spades: loadStats('spades'),
      euchre: loadStats('euchre'),
    }),
    [rev],
  )
  const stats = useMemo(() => allStats[game], [allStats, game])
  const combinedOverview = useMemo(() => {
    const h = allStats.hearts
    const s = allStats.spades
    const e = allStats.euchre
    const matchesPlayed = h.matchesPlayed + s.matchesPlayed + e.matchesPlayed
    const matchesWon = h.matchesWon + s.matchesWon + e.matchesWon
    const handsPlayed = h.handsPlayed + s.handsPlayed + e.handsPlayed
    const winPct =
      matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : null
    const bestStreak = Math.max(h.bestWinStreak, s.bestWinStreak, e.bestWinStreak)
    return [
      { label: 'Matches played', value: matchesPlayed },
      { label: 'Matches won', value: matchesWon },
      { label: 'Win rate', value: winPct != null ? `${winPct}%` : '—' },
      { label: 'Hands played', value: handsPlayed },
      { label: 'Best streak', value: bestStreak },
      {
        label: 'Hearts wins',
        value: h.matchesWon,
      },
      {
        label: 'Spades wins',
        value: s.matchesWon,
      },
      {
        label: 'Euchre wins',
        value: e.matchesWon,
      },
    ]
  }, [allStats])
  const unlocked = useMemo(() => {
    if (game === 'spades') return loadSpadesAchievements()
    if (game === 'euchre') return loadEuchreAchievements()
    return loadAchievements(game)
  }, [game, rev])
  const trophies = useMemo(() => loadTrophyCase(), [rev])
  const globalTrophies = useMemo(() => visibleTrophies(trophies), [trophies])
  const goals = useMemo(() => loadGoals(game), [game, rev])
  const visible = useMemo(() => {
    if (game === 'spades') return visibleSpadesAchievements(unlocked)
    if (game === 'euchre') return visibleEuchreAchievements(unlocked)
    return visibleAchievements(unlocked)
  }, [game, unlocked])

  const rate = winRate(stats)
  const moonRate = moonShootRate(stats)
  const moonedRate = moonAgainstRate(stats)
  const queenPct = queenRate(stats)
  const avgPts = avgPointsPerHand(stats)
  const cleanRate = cleanHandRate(stats)
  const unlockedCount = visible.filter((a) => unlocked[a.id]).length

  const teamOverview = [
    { label: 'Matches played', value: stats.matchesPlayed },
    { label: 'Matches won', value: stats.matchesWon },
    { label: 'Win rate', value: rate != null ? `${rate}%` : '—' },
    { label: 'Hands played', value: stats.handsPlayed },
    { label: 'Win streak', value: stats.winStreak },
    { label: 'Best streak', value: stats.bestWinStreak },
    { label: 'Highest win', value: stats.bestWinScore ?? '—' },
    { label: 'Lowest loss', value: stats.worstLossScore ?? '—' },
  ]

  const overview =
    game === 'spades' || game === 'euchre'
      ? teamOverview
      : [
          { label: 'Matches played', value: stats.matchesPlayed },
          { label: 'Matches won', value: stats.matchesWon },
          { label: 'Win rate', value: rate != null ? `${rate}%` : '—' },
          { label: 'Hands played', value: stats.handsPlayed },
          { label: 'Win streak', value: stats.winStreak },
          { label: 'Best streak', value: stats.bestWinStreak },
          { label: 'Best win score', value: stats.bestWinScore ?? '—' },
          { label: 'Worst loss score', value: stats.worstLossScore ?? '—' },
          { label: 'Best hand', value: stats.bestHandScore ?? '—' },
          { label: 'Worst hand', value: stats.worstHandScore ?? '—' },
        ]

  const nilRate = spadesNilRate(stats)
  const teamBidRate = spadesTeamBidRate(stats)
  const bagRate = spadesBagPenaltyRate(stats)

  const orderRate = euchreOrderRate(stats)
  const euchreRate = euchreEuchreRate(stats)
  const marchRate = euchreMarchRate(stats)
  const lonerRate = euchreLonerRate(stats)

  const rates =
    game === 'euchre'
      ? [
          {
            label: 'Order success rate',
            value: orderRate != null ? `${orderRate}%` : '—',
            hint: 'Times you ordered trump and made your point',
          },
          {
            label: 'Euchre rate',
            value: euchreRate != null ? `${euchreRate}%` : '—',
            hint: 'Hands you euchred the makers',
          },
          {
            label: 'March rate',
            value: marchRate != null ? `${marchRate}%` : '—',
            hint: 'Hands your team marched (all 5 tricks)',
          },
          {
            label: 'Loner success',
            value: lonerRate != null ? `${lonerRate}%` : '—',
            hint: 'Loners you called that scored',
          },
          {
            label: 'Orders made',
            value: stats.ordersMade,
            hint: 'Successful trump orders (you)',
          },
          {
            label: 'Euchres made',
            value: stats.euchresMade,
            hint: 'Defensive euchres (you)',
          },
          {
            label: 'Marches',
            value: stats.marchesMade,
            hint: 'Five-trick sweeps as makers',
          },
          {
            label: 'Loners scored',
            value: stats.lonersMade,
            hint: 'Loner hands that earned points',
          },
          {
            label: 'Hands per match',
            value:
              stats.matchesPlayed > 0
                ? String(Math.round((stats.handsPlayed / stats.matchesPlayed) * 10) / 10)
                : '—',
            hint: 'Average hands in completed matches',
          },
        ]
      : game === 'spades'
      ? [
          {
            label: 'Nil success rate',
            value: nilRate != null ? `${nilRate}%` : '—',
            hint: 'Your nil bids that succeeded',
          },
          {
            label: 'Team bid rate',
            value: teamBidRate != null ? `${teamBidRate}%` : '—',
            hint: 'Hands your team made its contract',
          },
          {
            label: 'Bag penalty rate',
            value: bagRate != null ? `${bagRate}%` : '—',
            hint: 'Hands that triggered a −100 bag bomb',
          },
          {
            label: 'Nils made',
            value: stats.nilMade,
            hint: 'Successful nil bids (you)',
          },
          {
            label: 'Team bids made',
            value: stats.teamBidsMade,
            hint: 'Contracts your team fulfilled',
          },
          {
            label: 'Bag penalties',
            value: stats.bagPenalties,
            hint: 'Times you hit 10 bags',
          },
          {
            label: 'Hands per match',
            value:
              stats.matchesPlayed > 0
                ? String(Math.round((stats.handsPlayed / stats.matchesPlayed) * 10) / 10)
                : '—',
            hint: 'Average hands in completed matches',
          },
        ]
      : [
          {
            label: 'Moon shoot rate',
            value: moonRate != null ? `${moonRate}%` : '—',
            hint: 'Hands you shot the moon',
          },
          {
            label: 'Mooned rate',
            value: moonedRate != null ? `${moonedRate}%` : '—',
            hint: 'Hands an opponent mooned you',
          },
          {
            label: 'Queen taken rate',
            value: queenPct != null ? `${queenPct}%` : '—',
            hint: 'Hands you ate the Q♠',
          },
          {
            label: 'Clean hand rate',
            value: cleanRate != null ? `${cleanRate}%` : '—',
            hint: 'Hands with 0 points',
          },
          {
            label: 'Light hands (≤5)',
            value: stats.handsUnderFive,
            hint: 'Hands with 1–5 points',
          },
          {
            label: 'Heavy hands (20+)',
            value: stats.handsHeavy,
            hint: 'Hands with 20+ points',
          },
          {
            label: 'Avg pts / hand',
            value: avgPts != null ? String(avgPts) : '—',
            hint: 'Career penalty average',
          },
          {
            label: 'Total pts taken',
            value: stats.pointsTaken,
            hint: 'All penalty points',
          },
        ]

  const periodLabels = { daily: 'Today', weekly: 'This week', monthly: 'This month' } as const

  return (
    <div className="stats-page">
      <div className="stats-page__glow stats-page__glow--a" aria-hidden />
      <div className="stats-page__glow stats-page__glow--b" aria-hidden />
      <div className="stats-page__noise" aria-hidden />

      <header className="stats-page__header">
        <button type="button" className="back-btn back-btn--pill" onClick={onBack}>
          <svg className="back-btn__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M14.5 5.5 8 12l6.5 6.5"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="back-btn__label">Back</span>
        </button>
        <div className="stats-page__header-title">
          <span className="stats-page__eyebrow">
            {meta.title} · Career
          </span>
          <h1 className="stats-page__title">Stats & Trophies</h1>
        </div>
        <div className="stats-page__header-spacer" aria-hidden />
      </header>

      <main className="stats-page__main">
        <section className="stats-card stats-card--combined">
          <div className="stats-card__head-row">
            <div>
              <h2 className="stats-card__title">All games</h2>
              <p className="stats-card__intro">
                Combined career totals across Hearts, Spades, and Euchre.
              </p>
            </div>
            <div className="stats-export-actions">
              <div className="stats-export-row">
                <button
                  type="button"
                  className="btn btn--ghost stats-export-btn"
                  onClick={async () => {
                    const ok = await copyCareerExportToClipboard()
                    setExportMsg(
                      ok ? 'Career snapshot copied to clipboard' : 'Could not copy — try again',
                    )
                    window.setTimeout(() => setExportMsg(null), 3200)
                  }}
                >
                  Copy snapshot
                </button>
                <button
                  type="button"
                  className="btn btn--ghost stats-export-btn"
                  onClick={async () => {
                    const ok = await copyCareerSummaryToClipboard()
                    setExportMsg(
                      ok ? 'Career summary copied to clipboard' : 'Could not copy — try again',
                    )
                    window.setTimeout(() => setExportMsg(null), 3200)
                  }}
                >
                  Copy summary
                </button>
              </div>
              <div className="stats-export-row">
                <button
                  type="button"
                  className="btn btn--ghost stats-export-btn"
                  onClick={() => {
                    downloadCareerExport()
                    setExportMsg('Career snapshot downloaded')
                    window.setTimeout(() => setExportMsg(null), 3200)
                  }}
                >
                  Download JSON
                </button>
                {canShareCareerSummary() && (
                  <button
                    type="button"
                    className="btn btn--ghost stats-export-btn"
                    onClick={async () => {
                      const ok = await shareCareerSummary()
                      setExportMsg(ok ? 'Share sheet opened' : 'Could not share — try copy instead')
                      window.setTimeout(() => setExportMsg(null), 3200)
                    }}
                  >
                    Share summary
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--ghost stats-export-btn"
                  onClick={() => importInputRef.current?.click()}
                >
                  Import JSON
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="stats-import-input"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    const text = await file.text()
                    const parsed = parseCareerImport(text)
                    if (!parsed.ok) {
                      setExportMsg(parsed.error)
                      window.setTimeout(() => setExportMsg(null), 3200)
                      return
                    }
                    setPendingImport({ name: file.name, data: parsed.data, mode: 'replace' })
                  }}
                />
              </div>
            </div>
          </div>
          {exportMsg && (
            <p className="stats-export-msg" role="status">
              {exportMsg}
            </p>
          )}
          <div className="stats-grid">
            {combinedOverview.map((item) => (
              <div key={item.label} className="stats-grid__item">
                <span className="stats-grid__value">{item.value}</span>
                <span className="stats-grid__label">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="stats-game-tabs" role="tablist" aria-label="Game">
          {STATS_GAMES.map((id) => {
            const g = gameMeta(id)
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={game === id}
                className={`stats-game-tabs__btn ${game === id ? 'is-active' : ''}`}
                onClick={() => {
                  setGame(id)
                  setConfirmReset(false)
                }}
              >
                <span aria-hidden>{g.icon}</span> {g.title}
              </button>
            )
          })}
        </div>

        <section className="stats-card">
          <h2 className="stats-card__title">Overview</h2>
          <div className="stats-grid">
            {overview.map((item) => (
              <div key={item.label} className="stats-grid__item">
                <span className="stats-grid__value">{item.value}</span>
                <span className="stats-grid__label">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="stats-card">
          <h2 className="stats-card__title">Rates & breakdown</h2>
          <ul className="stats-rates">
            {rates.map((item) => (
              <li key={item.label} className="stats-rates__row">
                <div>
                  <span className="stats-rates__label">{item.label}</span>
                  <span className="stats-rates__hint">{item.hint}</span>
                </div>
                <strong className="stats-rates__value">{item.value}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="stats-card">
          <h2 className="stats-card__title">Goals</h2>
          <p className="stats-card__intro">Daily, weekly, and monthly challenges — always something to chase.</p>
          <ul className="goal-list">
            {goals.active.map((g) => {
              const p = goals.progress[g.id]
              const pct = p ? Math.round((p.current / g.target) * 100) : 0
              return (
                <li key={g.id} className={`goal-row ${p?.completed ? 'goal-row--done' : ''}`}>
                  <span className="goal-row__icon" aria-hidden>
                    {g.icon}
                  </span>
                  <div className="goal-row__body">
                    <span className="goal-row__period">{periodLabels[g.period]}</span>
                    <strong className="goal-row__title">{g.title}</strong>
                    <span className="goal-row__desc">{g.description}</span>
                    <div className="goal-row__bar" aria-hidden>
                      <span className="goal-row__fill" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                  <span className="goal-row__prog">
                    {p?.current ?? 0}/{g.target}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        {stats.recentMatches.length > 0 && (
          <section className="stats-card">
            <h2 className="stats-card__title">Recent matches</h2>
            <ul className="match-history">
              {stats.recentMatches.slice(0, 12).map((m) => (
                <li key={m.at} className={`match-history__row ${m.won ? 'match-history__row--win' : ''}`}>
                  <span className="match-history__date">{formatDate(m.at)}</span>
                  <span className="match-history__result">{m.won ? 'Win' : 'Loss'}</span>
                  <span className="match-history__score">
                    You {m.yourScore} · winner {m.winnerScore}
                  </span>
                  <span className="match-history__meta">
                    {m.handsInMatch} hands
                    {game === 'hearts' && (
                      <>
                        {' '}
                        · {m.cleanHands} clean{m.moonsShot > 0 ? ` · ${m.moonsShot} moon` : ''}
                      </>
                    )}
                    {(game === 'spades' || game === 'euchre') && m.won && (
                      <> · won {m.yourScore}–{m.winnerScore}</>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="stats-card stats-card--trophy-case">
          <div className="stats-card__head">
            <h2 className="stats-card__title">Cutthroat Trophy Case</h2>
            <span className="stats-card__badge">
              {globalTrophies.filter((t) => trophies[t.id]).length}/{globalTrophies.length}
            </span>
          </div>
          <p className="stats-card__intro">Cross-game trophies — shared across Hearts, Spades, and Euchre.</p>
          <ul className="ach-grid">
            {globalTrophies.map((t) => {
              const done = Boolean(trophies[t.id])
              const progress = trophyProgress(t.id, trophies)
              return (
                <li
                  key={t.id}
                  className={[
                    'ach-card',
                    done ? 'ach-card--unlocked' : '',
                    `ach-card--${t.tier}`,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="ach-card__icon" aria-hidden>
                    {t.icon}
                  </span>
                  <div className="ach-card__body">
                    <strong className="ach-card__title">{t.title}</strong>
                    <span className="ach-card__desc">{t.description}</span>
                    {!done && progress && (
                      <span className="ach-card__progress">
                        {progress.current}/{progress.target}
                      </span>
                    )}
                  </div>
                  {done && <span className="ach-card__check" aria-label="Unlocked">✓</span>}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="stats-card">
          <div className="stats-card__head">
            <h2 className="stats-card__title">{meta.title} Achievements</h2>
            <span className="stats-card__badge">
              {unlockedCount}/{visible.length}
            </span>
          </div>
          <ul className="ach-grid">
            {visible.map((a) => {
              const done = Boolean(unlocked[a.id])
              const progress =
                game === 'hearts'
                  ? achievementProgress(a.id, stats)
                  : game === 'euchre'
                    ? euchreAchievementProgress(a.id, stats, unlocked)
                    : spadesAchievementProgress(a.id, stats, unlocked)
              return (
                <li
                  key={a.id}
                  className={[
                    'ach-card',
                    done ? 'ach-card--unlocked' : '',
                    `ach-card--${a.tier}`,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="ach-card__icon" aria-hidden>
                    {a.icon}
                  </span>
                  <div className="ach-card__body">
                    <strong className="ach-card__title">{a.title}</strong>
                    <span className="ach-card__desc">{a.description}</span>
                    {!done && progress && (
                      <span className="ach-card__progress">
                        {progress.current}/{progress.target}
                      </span>
                    )}
                  </div>
                  {done && <span className="ach-card__check" aria-label="Unlocked">✓</span>}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="stats-card stats-card--danger">
          {!confirmReset ? (
            <button
              type="button"
              className="btn btn--ghost stats-reset-btn"
              onClick={() => setConfirmReset(true)}
            >
              Reset {meta.title} career stats
            </button>
          ) : (
            <div className="stats-reset-confirm">
              <p>
                Clear all {meta.title} stats, match history, goals progress, and achievements?
              </p>
              <div className="stats-reset-confirm__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    resetStats(game)
                    localStorage.removeItem(achievementsKey(game))
                    localStorage.removeItem(goalsKey(game))
                    if (game === 'hearts') {
                      localStorage.removeItem('hearts.achievements.v1')
                    }
                    setConfirmReset(false)
                    setRev((r) => r + 1)
                  }}
                >
                  Yes, reset everything
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {pendingImport && (
        <div className="stats-import-confirm" role="dialog" aria-labelledby="stats-import-title">
          <button
            type="button"
            className="stats-import-confirm__backdrop"
            aria-label="Dismiss dialog"
            onClick={() => setPendingImport(null)}
          />
          <div className="stats-import-confirm__card">
            <p className="stats-import-confirm__eyebrow">Career import</p>
            <h2 id="stats-import-title" className="stats-import-confirm__title">
              Import career snapshot?
            </h2>
            <p className="stats-import-confirm__sub">
              <strong>{pendingImport.name}</strong> — choose whether to replace local career data
              or merge higher totals and unlocks. Match saves are not changed.
            </p>
            <div className="stats-import-mode" role="radiogroup" aria-label="Import mode">
              <label className="stats-import-mode__opt">
                <input
                  type="radio"
                  name="import-mode"
                  checked={pendingImport.mode === 'replace'}
                  onChange={() =>
                    setPendingImport((p) => (p ? { ...p, mode: 'replace' } : p))
                  }
                />
                <span>
                  <strong>Replace</strong> — overwrite stats and unlocks
                </span>
              </label>
              <label className="stats-import-mode__opt">
                <input
                  type="radio"
                  name="import-mode"
                  checked={pendingImport.mode === 'merge'}
                  onChange={() =>
                    setPendingImport((p) => (p ? { ...p, mode: 'merge' } : p))
                  }
                />
                <span>
                  <strong>Merge</strong> — keep higher totals and union unlocks
                </span>
              </label>
            </div>
            <div className="stats-import-confirm__actions">
              <button
                type="button"
                className="btn btn--ghost btn--lg"
                onClick={() => setPendingImport(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={() => {
                  applyCareerImport(pendingImport.data, pendingImport.mode)
                  setRev((r) => r + 1)
                  setExportMsg(
                    pendingImport.mode === 'merge'
                      ? 'Career merged successfully'
                      : 'Career imported successfully',
                  )
                  window.setTimeout(() => setExportMsg(null), 3200)
                  setPendingImport(null)
                }}
              >
                {pendingImport.mode === 'merge' ? 'Merge' : 'Replace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}