import { useEffect } from 'react'
import { CHARACTERS, getCharacter } from '../characters'
import './CharacterPicker.css'

interface Props {
  open: boolean
  playerName: string
  selectedId: string
  onSelect: (characterId: string) => void
  onClose: () => void
}

export function CharacterPicker({
  open,
  playerName,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const selected = getCharacter(selectedId)

  return (
    <div className="char-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="char-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Choose avatar for ${playerName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="char-sheet__grab" aria-hidden />
        <header className="char-sheet__header">
          <div>
            <p className="char-sheet__eyebrow">Profile</p>
            <h2 className="char-sheet__title">Choose avatar</h2>
            <p className="char-sheet__sub">For {playerName}</p>
          </div>
          <div className="char-sheet__preview">
            <img src={selected.portrait} alt="" draggable={false} />
          </div>
        </header>

        <div className="char-sheet__grid">
          {CHARACTERS.map((c) => {
            const active = c.id === selectedId
            return (
              <button
                key={c.id}
                type="button"
                className={`char-sheet__item ${active ? 'is-active' : ''}`}
                onClick={() => {
                  onSelect(c.id)
                  onClose()
                }}
                aria-pressed={active}
              >
                <span className="char-sheet__disc">
                  <img src={c.portrait} alt="" draggable={false} />
                </span>
                <span className="char-sheet__label">{c.label}</span>
                {active && <span className="char-sheet__check">✓</span>}
              </button>
            )
          })}
        </div>

        <button type="button" className="btn btn--ghost char-sheet__done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
