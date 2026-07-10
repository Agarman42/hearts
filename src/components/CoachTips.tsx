import { useState } from 'react'
import { markCoachSeen } from '../coach'
import './CoachTips.css'

const TIPS = [
  {
    title: 'Play a card',
    body: 'Press a card, drag it up toward the table, then release to play. Pull it back into your hand to cancel.',
    icon: '↑',
  },
  {
    title: 'Pass three',
    body: 'Each hand you pass 3 cards left, right, or across — then hold. Dump dangers (Q♠, high hearts) when you can.',
    icon: '↔',
  },
  {
    title: 'Avoid points… or moon',
    body: 'Hearts are 1 each, Queen of Spades is 13. Take all 26 to shoot the moon and dump them on everyone else.',
    icon: '🌙',
  },
] as const

interface Props {
  open: boolean
  onDone: () => void
}

export function CoachTips({ open, onDone }: Props) {
  const [step, setStep] = useState(0)
  if (!open) return null

  const tip = TIPS[step]
  const last = step >= TIPS.length - 1

  return (
    <div className="coach" role="dialog" aria-label="How to play">
      <div className="coach__card">
        <p className="coach__eyebrow">
          Quick tip {step + 1} / {TIPS.length}
        </p>
        <div className="coach__icon" aria-hidden>
          {tip.icon}
        </div>
        <h2 className="coach__title">{tip.title}</h2>
        <p className="coach__body">{tip.body}</p>
        <div className="coach__dots" aria-hidden>
          {TIPS.map((_, i) => (
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
                markCoachSeen()
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
              markCoachSeen()
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
