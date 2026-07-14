import { useState } from 'react'
import type { CoachTip } from '../coach'
import { markCoachSeen } from '../coach'
import type { GameId } from '../games/registry'
import './CoachTips.css'

interface Props {
  open: boolean
  onDone: () => void
  tips: readonly CoachTip[]
  gameId?: GameId
}

export function CoachTips({ open, onDone, tips, gameId = 'hearts' }: Props) {
  const [step, setStep] = useState(0)
  if (!open) return null

  const tip = tips[step]
  const last = step >= tips.length - 1

  return (
    <div className="coach" role="dialog" aria-label="How to play">
      <div className="coach__card">
        <p className="coach__eyebrow">
          Quick tip {step + 1} / {tips.length}
        </p>
        <div className="coach__icon" aria-hidden>
          {tip.icon}
        </div>
        <h2 className="coach__title">{tip.title}</h2>
        <p className="coach__body">{tip.body}</p>
        <div className="coach__dots" aria-hidden>
          {tips.map((_, i) => (
            <span key={i} className={i === step ? 'is-on' : ''} />
          ))}
        </div>
        <div className="coach__actions">
          {!last ? (
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => {
                markCoachSeen(gameId)
                onDone()
              }}
            >
              Deal me in
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--lg"
            onClick={() => {
              markCoachSeen(gameId)
              onDone()
            }}
          >
            Skip tips
          </button>
        </div>
      </div>
    </div>
  )
}