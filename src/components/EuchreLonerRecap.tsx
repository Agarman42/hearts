import './Overlay.css'
import './EuchreTrumpPanel.css'

interface Props {
  makerName: string
  partnerName: string | null
  alone: boolean
  onContinue: () => void
}

export function EuchreLonerRecap({ makerName, partnerName, alone, onContinue }: Props) {
  return (
    <div
      className="overlay overlay--euchre-loner"
      role="dialog"
      aria-modal="true"
      aria-labelledby="euchre-loner-recap-title"
    >
      <div className="overlay__card euchre-trump-recap">
        <div className="overlay__badge">Loner choice</div>
        <h2 id="euchre-loner-recap-title" className="euchre-trump-recap__title">
          {alone ? (
            <>
              <span className="euchre-trump-recap__maker">{makerName}</span> goes alone
            </>
          ) : (
            <>
              <span className="euchre-trump-recap__maker">{makerName}</span> plays with partner
            </>
          )}
        </h2>
        <p className="euchre-trump-recap__explain">
          {alone ? (
            <>
              {partnerName} sits out · march alone for 4 points.
            </>
          ) : (
            <>Both partners in — need 3 tricks to make the point.</>
          )}
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