import './EuchreTrumpPanel.css'

interface Props {
  lonerAllowed?: boolean
  onGoAlone: () => void
  onWithPartner: () => void
}

export function EuchreLonerPanel({
  lonerAllowed = true,
  onGoAlone,
  onWithPartner,
}: Props) {
  return (
    <div className="euchre-trump" role="form" aria-label="Loner choice">
      <p className="euchre-trump__eyebrow">Trump set</p>
      <h2 className="euchre-trump__title">Go alone?</h2>
      <p className="euchre-trump__hint">
        {lonerAllowed
          ? 'March alone for 4 points · partner sits out'
          : 'Your team is close to winning — play with partner'}
      </p>
      <div className="euchre-trump__actions">
        {lonerAllowed && (
          <button type="button" className="btn btn--primary btn--lg" onClick={onGoAlone}>
            Go alone
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--lg" onClick={onWithPartner}>
          With partner
        </button>
      </div>
    </div>
  )
}