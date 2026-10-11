import { useMemo, useState } from 'react'
import { shareOrCopy } from '../shareScore'
import {
  NIGHT_ROUNDS,
  NIGHT_SIZES,
  advanceNight,
  createNight,
  enterScore,
  loadNight,
  nightResultsText,
  rememberNight,
  roundReady,
  standings,
  type Night,
  type NightScore,
} from '../tournament'
import './EuchreNight.css'

interface Props {
  onClose: () => void
}

function across(night: Night, seats: Night['rounds'][number]['tables'][number]['seats'], a: number, b: number) {
  return `${night.names[seats[a]]} & ${night.names[seats[b]]}`
}

export function EuchreNight({ onClose }: Props) {
  const [night, setNight] = useState<Night | null>(() => loadNight())
  const [size, setSize] = useState<(typeof NIGHT_SIZES)[number]>(12)
  const [namesText, setNamesText] = useState('')
  const [drafts, setDrafts] = useState<Record<number, { ns: string; ew: string }>>({})
  const [confirmNew, setConfirmNew] = useState(false)
  const [copied, setCopied] = useState(false)
  const board = useMemo(() => (night ? standings(night) : []), [night])

  function commit(next: Night | null) {
    setNight(next)
    rememberNight(next)
  }

  function start() {
    const lines = namesText
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const raw = Array.from({ length: size }, (_, index) => lines[index] ?? '')
    commit(createNight(raw))
    setDrafts({})
    setConfirmNew(false)
  }

  function saveTable(tableIndex: number) {
    if (!night) return
    const draft = drafts[tableIndex]
    const existing = night.scores[night.currentRound]?.[tableIndex]
    const score: NightScore = {
      ns: Number(draft?.ns ?? existing?.ns ?? 0),
      ew: Number(draft?.ew ?? existing?.ew ?? 0),
    }
    commit(enterScore(night, tableIndex, score))
  }

  function goOn() {
    if (!night) return
    commit(advanceNight(night))
    setDrafts({})
  }

  async function copyResults() {
    if (!night) return
    const result = await shareOrCopy(nightResultsText(night))
    if (result !== 'failed') {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  return (
    <div className="night">
      <header className="night__bar">
        <button type="button" className="back-btn back-btn--pill" onClick={onClose}>
          <span className="back-btn__label">Home</span>
        </button>
        <h1 className="night__title">Euchre night</h1>
      </header>

      {!night && (
        <form
          className="night__setup"
          onSubmit={(event) => {
            event.preventDefault()
            start()
          }}
        >
          <p className="night__lead">
            Six rounds, new partners each time. Scores stay on this phone. The tables are not
            connected online.
          </p>
          <div className="night__sizes" role="group" aria-label="Number of players">
            {NIGHT_SIZES.map((count) => (
              <button
                key={count}
                type="button"
                className={count === size ? 'night__size night__size--on' : 'night__size'}
                aria-pressed={count === size}
                onClick={() => setSize(count)}
              >
                {count} players
              </button>
            ))}
          </div>
          <label className="night__names">
            Names, one per line
            <textarea
              value={namesText}
              onChange={(event) => setNamesText(event.target.value)}
              rows={6}
              placeholder={'Ada\nBo\nCy'}
            />
          </label>
          <p className="night__hint">Blank spots are filled in as Player 1, Player 2, and so on.</p>
          <button type="submit" className="night__go">
            Start night
          </button>
        </form>
      )}

      {night && (
        <div className="night__board">
          <p className="night__round">
            {night.complete
              ? 'Final standings'
              : `Round ${night.currentRound + 1} of ${NIGHT_ROUNDS}`}
          </p>
          {!night.complete &&
            night.rounds[night.currentRound]?.tables.map((table, index) => {
              const saved = night.scores[night.currentRound]?.[index]
              const draft = drafts[index]
              return (
                <section key={index} className="night__table" aria-label={`Table ${index + 1}`}>
                  <h2>Table {index + 1}</h2>
                  <p>North-South · {across(night, table.seats, 0, 2)}</p>
                  <p>East-West · {across(night, table.seats, 1, 3)}</p>
                  <div className="night__scores">
                    <label>
                      North-South
                      <input
                        inputMode="numeric"
                        value={draft?.ns ?? (saved ? String(saved.ns) : '')}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [index]: { ns: event.target.value, ew: prev[index]?.ew ?? (saved ? String(saved.ew) : '') },
                          }))
                        }
                      />
                    </label>
                    <label>
                      East-West
                      <input
                        inputMode="numeric"
                        value={draft?.ew ?? (saved ? String(saved.ew) : '')}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [index]: { ns: prev[index]?.ns ?? (saved ? String(saved.ns) : ''), ew: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <button type="button" onClick={() => saveTable(index)}>
                      Save
                    </button>
                  </div>
                </section>
              )
            })}

          <section className="night__standings" aria-label="Standings">
            <h2>Standings</h2>
            <ol>
              {board.map((row) => (
                <li key={row.name}>
                  <span>{row.name}</span>
                  <span>{row.points}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="night__actions">
            {!night.complete && (
              <button type="button" className="night__go" disabled={!roundReady(night)} onClick={goOn}>
                {night.currentRound === NIGHT_ROUNDS - 1 ? 'Finish night' : 'Next round'}
              </button>
            )}
            <button type="button" className="night__quiet" onClick={() => void copyResults()}>
              {copied ? 'Copied' : 'Copy results'}
            </button>
            {confirmNew ? (
              <button
                type="button"
                className="night__quiet"
                onClick={() => {
                  commit(null)
                  setDrafts({})
                  setConfirmNew(false)
                }}
              >
                Clear this night
              </button>
            ) : (
              <button type="button" className="night__quiet" onClick={() => setConfirmNew(true)}>
                New night
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
