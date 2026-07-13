import { useState } from 'react'
import './SpadesTable.css'

interface Props {
  nilAllowed: boolean
  partnerName: string
  onSubmit: (bid: number, nil: boolean) => void
}

export function SpadesBidPanel({ nilAllowed, partnerName, onSubmit }: Props) {
  const [bid, setBid] = useState(4)
  const [nil, setNil] = useState(false)

  return (
    <div className="spades-bid" role="form" aria-label="Place your bid">
      <div className="spades-bid__header">
        <p className="spades-bid__eyebrow">Bidding</p>
        <h2 className="spades-bid__title">How many tricks will you take?</h2>
        <p className="spades-bid__sub">
          Partner: <strong>{partnerName}</strong> · Team bids combine
        </p>
      </div>

      <div className="spades-bid__controls">
        <div className="spades-bid__stepper" aria-label="Bid amount">
          <button
            type="button"
            className="spades-bid__step"
            onClick={() => setBid((b) => Math.max(1, b - 1))}
            disabled={nil}
            aria-label="Decrease bid"
          >
            −
          </button>
          <span className="spades-bid__value" aria-live="polite">
            {nil ? 'Nil' : bid}
          </span>
          <button
            type="button"
            className="spades-bid__step"
            onClick={() => setBid((b) => Math.min(13, b + 1))}
            disabled={nil}
            aria-label="Increase bid"
          >
            +
          </button>
        </div>

        <div className="spades-bid__quick" aria-label="Quick bids">
          {[2, 4, 6, 8].map((n) => (
            <button
              key={n}
              type="button"
              className={`spades-bid__quick-btn ${!nil && bid === n ? 'is-active' : ''}`}
              onClick={() => {
                setNil(false)
                setBid(n)
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {nilAllowed && (
          <button
            type="button"
            className={`spades-bid__nil ${nil ? 'is-active' : ''}`}
            onClick={() => setNil((v) => !v)}
          >
            Bid Nil <span className="spades-bid__nil-hint">(+100 if you take zero)</span>
          </button>
        )}
      </div>

      <button
        type="button"
        className="btn btn--primary btn--lg spades-bid__confirm"
        onClick={() => onSubmit(nil ? 0 : bid, nil)}
      >
        Lock in {nil ? 'Nil' : bid}
      </button>
    </div>
  )
}