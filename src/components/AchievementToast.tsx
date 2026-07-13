import type { Achievement } from '../achievements'
import './AchievementToast.css'

interface Props {
  achievement: Achievement | null
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
        <span className="ach-toast__label">Achievement unlocked</span>
        <strong className="ach-toast__title">{achievement.title}</strong>
        <span className="ach-toast__desc">{achievement.description}</span>
      </div>
    </div>
  )
}