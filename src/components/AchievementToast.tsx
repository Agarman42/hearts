import type { Achievement } from '../achievements'
import { TROPHY_CASE, type Trophy } from '../trophyCase'
import './AchievementToast.css'

type Unlock = Achievement | Trophy

function isTrophy(item: Unlock): item is Trophy {
  return TROPHY_CASE.some((t) => t.id === item.id)
}

interface Props {
  achievement: Unlock | null
  onDone: () => void
}

export function AchievementToast({ achievement, onDone }: Props) {
  if (!achievement) return null

  return (
    <div
      className={`ach-toast ach-toast--${achievement.tier}`}
      role="status"
      aria-live="polite"
      onAnimationEnd={(e) => {
        if (e.animationName === 'achToastOut') onDone()
      }}
    >
      <span className="ach-toast__icon" aria-hidden>
        {achievement.icon}
      </span>
      <div className="ach-toast__body">
        <span className="ach-toast__label">
          {isTrophy(achievement) ? 'Trophy unlocked' : 'Achievement unlocked'}
        </span>
        <strong className="ach-toast__title">{achievement.title}</strong>
        <span className="ach-toast__desc">{achievement.description}</span>
      </div>
    </div>
  )
}