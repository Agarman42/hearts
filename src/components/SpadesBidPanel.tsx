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

  const lockLabel =
    mode === 'blind_nil' ? 'Blind Nil' : mode === 'nil' ? 'Nil' : String(bid)

  const prePeek = blindNilAllowed && !handRevealed
  const blindNilOffered = blindNilAllowed && !handRevealed

  useEffect(() => {
    if (handRevealed && mode === 'blind_nil') setMode('number')
  }, [handRevealed, mode])

  return (
    <div className="spades-bid" role="form" aria-label="Place your bid">
      <div className="spades-bid__header">
        <p className="spades-bid__eyebrow">Bidding</p>
        <h2 className="spades-bid__title">Your bid</h2>
        <p className="spades-bid__sub">
          Partner <strong>{partnerName}</strong>
          {prePeek
            ? ' · cards face-down — peek to bid, or go blind nil'
            : nilAllowed
              ? ' · pick 1–13 or nil'
              : ' · pick 1–13'}
        </p>
      </div>

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
            {blindNilOffered && (
              <button
                type="button"
                className={`spades-bid__nil spades-bid__nil--blind ${mode === 'blind_nil' ? 'is-active' : ''}`}
                onClick={() => setMode(mode === 'blind_nil' ? 'number' : 'blind_nil')}
              >
                Blind Nil
                <span className="spades-bid__nil-hint">+200 if you take zero tricks</span>
              </button>
            )}
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

      <button
        type="button"
        className="btn btn--primary btn--lg spades-bid__confirm"
        disabled={prePeek && mode !== 'blind_nil'}
        onClick={() =>
          onSubmit({
            bid: mode === 'number' ? bid : 0,
            nil: mode === 'nil' || mode === 'blind_nil',
            blindNil: mode === 'blind_nil',
          })
        }
      >
        {prePeek && mode !== 'blind_nil' ? 'Peek to bid a number' : `Lock in ${lockLabel}`}
      </button>
    </div>
  )
}