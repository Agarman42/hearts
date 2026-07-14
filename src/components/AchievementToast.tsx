import { useEffect, useRef } from 'react'
import type { Achievement } from '../achievements'
import { fxUnlock } from '../fx'
import { TROPHY_CASE, type Trophy } from '../trophyCase'
import './AchievementToast.css'

type Unlock = Achievement | Trophy

function isTrophy(item: Unlock): item is Trophy {
  return TROPHY_CASE.some((t) => t.id === item.id)
}

interface Props {
  achievement: Unlock | null
  soundEnabled?: boolean
  hapticsEnabled?: boolean
  onDone: () => void
}

export function AchievementToast({
  achievement,
  soundEnabled = false,
  hapticsEnabled = true,
  onDone,
}: Props) {
  const prevId = useRef<string | null>(null)

  useEffect(() => {
    if (!achievement) {
      prevId.current = null
      return
    }
    if (prevId.current === achievement.id) return
    prevId.current = achievement.id
    fxUnlock({ soundEnabled, hapticsEnabled })
  }, [achievement, soundEnabled, hapticsEnabled])

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