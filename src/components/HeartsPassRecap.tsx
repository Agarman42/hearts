import './Overlay.css'
import './HeartsPassRecap.css'

const DIR_LABEL: Record<string, string> = {
  left: 'Pass left',
  right: 'Pass right',
  across: 'Pass across',
}

interface Props {
  direction: string
  passCount: number
  handNumber: number
  onContinue: () => void
}

export function HeartsPassRecap({ direction, passCount, handNumber, onContinue }: Props) {
  const dirLabel = DIR_LABEL[direction] ?? 'Cards passed'
  const cardsLabel = passCount === 1 ? '1 card' : `${passCount} cards`

  return (
    <div
      className="overlay overlay--hearts-pass"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hearts-pass-recap-title"
    >
      <div className="overlay__card hearts-pass-recap">
        <div className="overlay__badge">Pass complete</div>
        <h2 id="hearts-pass-recap-title" className="hearts-pass-recap__title">
          {dirLabel}
        </h2>
        <p className="hearts-pass-recap__explain">
          Hand {handNumber} · everyone passed {cardsLabel} · 2♣ leads.
        </p>
        <div className="overlay__actions">
          <button type="button" className="btn btn--primary" onClick={onContinue} autoFocus>
            Ready to play
          </button>
        </div>
      </div>
    </div>
  )
}