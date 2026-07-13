import { useMemo } from 'react'
import {
  ACHIEVEMENTS,
  achievementProgress,
  loadAchievements,
} from '../achievements'
import {
  avgPointsPerHand,
  cleanHandRate,
  loadStats,
  moonAgainstRate,
  moonShootRate,
  queenRate,
  winRate,
} from '../stats'
import './Stats.css'

interface Props {
  onBack: () => void
}

export function Stats({ onBack }: Props) {
  const stats = useMemo(() => loadStats(), [])
  const unlocked = useMemo(() => loadAchievements(), [])
  const rate = winRate(stats)
  const moonRate = moonShootRate(stats)
  const moonedRate = moonAgainstRate(stats)
  const queenPct = queenRate(stats)
  const avgPts = avgPointsPerHand(stats)
  const cleanRate = cleanHandRate(stats)
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length

  const overview = [
    { label: 'Matches played', value: stats.matchesPlayed },
    { label: 'Matches won', value: stats.matchesWon },
    { label: 'Win rate', value: rate != null ? `${rate}%` : '—' },
    { label: 'Hands played', value: stats.handsPlayed },
    { label: 'Best win score', value: stats.bestWinScore ?? '—' },
    { label: 'Win streak', value: stats.winStreak },
    { label: 'Best streak', value: stats.bestWinStreak },
  ]

  const rates = [
    { label: 'Moon shoot rate', value: moonRate != null ? `${moonRate}%` : '—', hint: 'Hands you shot the moon' },
    { label: 'Mooned rate', value: moonedRate != null ? `${moonedRate}%` : '—', hint: 'Hands an opponent mooned you' },
    { label: 'Queen taken rate', value: queenPct != null ? `${queenPct}%` : '—', hint: 'Hands you ate the Q♠' },
    { label: 'Clean hand rate', value: cleanRate != null ? `${cleanRate}%` : '—', hint: 'Hands with 0 points' },
    { label: 'Avg pts / hand', value: avgPts != null ? String(avgPts) : '—', hint: 'Your average penalty per hand' },
    { label: 'Total pts taken', value: stats.pointsTaken, hint: 'Career penalty points' },
  ]

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
          <span className="stats-page__eyebrow">Career</span>
          <h1 className="stats-page__title">Stats & Trophies</h1>
        </div>
        <div className="stats-page__header-spacer" aria-hidden />
      </header>

      <main className="stats-page__main">
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
          <h2 className="stats-card__title">Rates & averages</h2>
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
          <div className="stats-card__head">
            <h2 className="stats-card__title">Achievements</h2>
            <span className="stats-card__badge">
              {unlockedCount}/{ACHIEVEMENTS.length}
            </span>
          </div>
          <ul className="ach-grid">
            {ACHIEVEMENTS.map((a) => {
              const done = Boolean(unlocked[a.id])
              const progress = achievementProgress(a.id, stats)
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
      </main>
    </div>
  )
}