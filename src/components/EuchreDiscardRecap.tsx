import type { Suit } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import './Overlay.css'
import './EuchreTrumpPanel.css'

interface Props {
  dealerName: string
  makerName: string
  trump: Suit
  onContinue: () => void
}

export function EuchreDiscardRecap({ dealerName, makerName, trump, onContinue }: Props) {
  const sym = SUIT_SYMBOL[trump]

  return (
    <div
      className="overlay overlay--euchre-discard"
      role="dialog"
      aria-modal="true"
      aria-labelledby="euchre-discard-recap-title"
    >
      <div className="overlay__card euchre-trump-recap">
        <div className="overlay__badge">Dealer discard</div>
        <h2 id="euchre-discard-recap-title" className="euchre-trump-recap__title">
          <span className="euchre-trump-recap__maker">{dealerName}</span> threw one back
        </h2>
        <p className="euchre-trump-recap__explain">
          {makerName} ordered <span className="euchre-trump-recap__suit-inline">{sym}</span> trump.
          The kitty pickup stays — {dealerName} is down to five cards.
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