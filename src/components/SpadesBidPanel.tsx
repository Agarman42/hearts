import { useEffect, useState } from 'react'
import './SpadesTable.css'

export type BidChoice = { bid: number; nil: boolean; blindNil: boolean }

interface Props {
  nilAllowed: boolean
  blindNilAllowed: boolean
  handRevealed: boolean
  partnerName: string
  onPeek: () => void
  onSubmit: (choice: BidChoice) => void
}

type BidMode = 'number' | 'nil' | 'blind_nil'

export function SpadesBidPanel({
  nilAllowed,
  blindNilAllowed,
  handRevealed,
  partnerName,
  onPeek,
  onSubmit,
}: Props) {
  const [bid, setBid] = useState(4)
  const [mode, setMode] = useState<BidMode>('number')

  const prePeek = blindNilAllowed && !handRevealed
  const showBidPicker = !prePeek

  const lockLabel =
    mode === 'blind_nil' ? 'Blind Nil' : mode === 'nil' ? 'Nil' : String(bid)

  useEffect(() => {
    if (handRevealed && mode === 'blind_nil') setMode('number')
  }, [handRevealed, mode])

  return (
    <div className="spades-bid" role="form" aria-label="Place your bid">
      <div className="spades-bid__header">
        <p className="spades-bid__eyebrow">Bidding</p>
        <h2 className="spades-bid__title">
          {prePeek ? 'Before you look' : 'Your bid'}
        </h2>
        <p className="spades-bid__sub">
          Partner <strong>{partnerName}</strong>
          {prePeek
            ? ' · look at your cards to bid, or commit to blind nil'
            : handRevealed && blindNilAllowed
              ? ' · blind nil is closed after peeking'
              : nilAllowed
                ? ' · pick 1–13 or nil'
                : ' · pick 1–13'}
        </p>
      </div>

      {handRevealed && blindNilAllowed && !prePeek && (
        <p className="spades-bid__revealed-note" role="status">
          Cards revealed — pick a number bid or nil.
        </p>
      )}

      <div className="spades-bid__controls">
        {prePeek ? (
          <div className="spades-bid__prepeek">
            <button
              type="button"
              className="btn btn--primary btn--lg spades-bid__peek"
              onClick={onPeek}
            >
              Look at my cards
            </button>
            <button
              type="button"
              className={`spades-bid__nil spades-bid__nil--blind ${mode === 'blind_nil' ? 'is-active' : ''}`}
              onClick={() => setMode(mode === 'blind_nil' ? 'number' : 'blind_nil')}
            >
              Blind Nil
              <span className="spades-bid__nil-hint">+200 if you take zero tricks</span>
            </button>
          </div>
        ) : (
          <>
            <div className="spades-bid__picker" role="group" aria-label="Bid 1 through 13">
              {Array.from({ length: 13 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`spades-bid__pick ${mode === 'number' && bid === n ? 'is-active' : ''}`}
                  onClick={() => {
                    setMode('number')
                    setBid(n)
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            {nilAllowed && (
              <div className="spades-bid__specials">
                <button
                  type="button"
                  className={`spades-bid__nil ${mode === 'nil' ? 'is-active' : ''}`}
                  onClick={() => setMode(mode === 'nil' ? 'number' : 'nil')}
                >
                  Nil
                  <span className="spades-bid__nil-hint">+100 if you take zero tricks</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {(showBidPicker || mode === 'blind_nil') && (
        <button
          type="button"
          className="btn btn--primary btn--lg spades-bid__confirm"
          onClick={() =>
            onSubmit({
              bid: mode === 'number' ? bid : 0,
              nil: mode === 'nil' || mode === 'blind_nil',
              blindNil: mode === 'blind_nil',
            })
          }
        >
          {`Lock in ${lockLabel}`}
        </button>
      )}
    </div>
  )
}