import { useState } from 'react'
import { AiDifficulty, Seat, SEATS } from '../core/types'
import { HeartsState } from '../games/hearts/engine'
import { GameRulesConfig } from '../games/types'
import {
  CARD_BACKS,
  CardBackStyle,
  FELT_STYLES,
  FeltStyle,
  GameSpeed,
  SPEED_LABELS,
  UserPrefs,
} from '../prefs'
import { Avatar } from './Avatar'
import { CharacterPicker } from './CharacterPicker'
import './Settings.css'

interface Props {
  state: HeartsState
  prefs: UserPrefs
  onBack: () => void
  onUpdateDifficulty: (seat: Seat, d: AiDifficulty) => void
  onUpdateName: (seat: Seat, name: string) => void
  onUpdateCharacter: (seat: Seat, characterId: string) => void
  onUpdateRules: (rules: Partial<GameRulesConfig>) => void
  onSetGameSpeed: (speed: GameSpeed) => void
  onSetAutoFinishHand: (v: boolean) => void
  onSetFeltStyle: (felt: FeltStyle) => void
  onSetCardBack: (back: CardBackStyle) => void
  onSetHapticsEnabled: (v: boolean) => void
  onSetHumorMode: (v: boolean) => void
}

const DIFFS: AiDifficulty[] = ['easy', 'medium', 'hard']
const SPEEDS: GameSpeed[] = ['instant', 'fast', 'normal', 'slow']

export function Settings({
  state,
  prefs,
  onBack,
  onUpdateDifficulty,
  onUpdateName,
  onUpdateCharacter,
  onUpdateRules,
  onSetGameSpeed,
  onSetAutoFinishHand,
  onSetFeltStyle,
  onSetCardBack,
  onSetHapticsEnabled,
  onSetHumorMode,
}: Props) {
  const r = prefs.rules
  const [pickerSeat, setPickerSeat] = useState<Seat | null>(null)

  return (
    <div className="settings">
      <div className="settings__glow settings__glow--a" aria-hidden />
      <div className="settings__glow settings__glow--b" aria-hidden />
      <div className="settings__glow settings__glow--c" aria-hidden />
      <div className="settings__noise" aria-hidden />

      <header className="settings__header">
        <button type="button" className="back-btn back-btn--pill" onClick={onBack}>
          <svg
            className="back-btn__icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M14.5 5.5 8 12l6.5 6.5"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="back-btn__label">Back</span>
        </button>
        <div className="settings__header-title">
          <span className="settings__eyebrow">
            <span className="settings__eyebrow-heart" aria-hidden>
              ♥
            </span>
            Hearts
          </span>
          <h1>Settings</h1>
        </div>
        <div className="settings__header-spacer" aria-hidden />
      </header>

      <div className="settings__body">
        {/* —— Players —— */}
        <p className="settings__group-label">Table</p>
        <section className="settings__card">
          <div className="settings__card-intro">
            <h2>Players</h2>
            <p>
              Tap a name to rename anyone — including Angie, Scott, and Heather. Avatars and AI
              skill save automatically.
            </p>
          </div>

          <div className="roster">
            {SEATS.map((seat) => {
              const p = state.players[seat]
              const isHuman = seat === 0
              return (
                <div key={seat} className="roster__row">
                  <button
                    type="button"
                    className="roster__avatar-btn"
                    onClick={() => setPickerSeat(seat)}
                    aria-label={`Change avatar for ${prefs.seats[seat].name}`}
                  >
                    <Avatar characterId={p.characterId} size="lg" />
                    <span className="roster__avatar-edit">Edit</span>
                  </button>

                  <div className="roster__main">
                    <div className="roster__name-row">
                      <input
                        className="roster__name"
                        type="text"
                        maxLength={16}
                        value={prefs.seats[seat].name}
                        onChange={(e) => onUpdateName(seat, e.target.value)}
                        placeholder={isHuman ? 'Your name' : 'Player name'}
                        aria-label={
                          isHuman
                            ? 'Your name'
                            : `Rename ${prefs.seats[seat].name || 'opponent'}`
                        }
                      />
                      <span className="roster__role">
                        {isHuman ? 'You' : 'AI · tap name to edit'}
                      </span>
                    </div>

                    {!isHuman ? (
                      <div className="roster__skill" role="group" aria-label="Skill">
                        {DIFFS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            className={`roster__skill-btn ${
                              prefs.seats[seat].difficulty === d ? 'is-active' : ''
                            }`}
                            onClick={() => onUpdateDifficulty(seat, d)}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="roster__you-hint">Tap the photo to change your avatar</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* —— Pace —— */}
        <p className="settings__group-label">Feel</p>
        <section className="settings__card settings__card--accent">
          <div className="settings__card-intro">
            <div className="settings__card-intro-row">
              <h2>Game pace</h2>
              <span className="settings__live">Live</span>
            </div>
            <p>How quickly opponents think and how long tricks linger.</p>
          </div>

          <div className="pace-rail" role="radiogroup" aria-label="Game speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={prefs.gameSpeed === s}
                className={`pace-rail__btn ${prefs.gameSpeed === s ? 'is-active' : ''}`}
                onClick={() => onSetGameSpeed(s)}
              >
                <span className="pace-rail__name">{SPEED_LABELS[s]}</span>
                <span className="pace-rail__meta">
                  {s === 'instant'
                    ? 'Snap'
                    : s === 'fast'
                      ? 'Quick'
                      : s === 'normal'
                        ? 'Steady'
                        : 'Leisure'}
                </span>
              </button>
            ))}
          </div>

          <div className="settings__inset">
            <Toggle
              label="Auto-finish hand"
              hint="Buzz through remaining cards after all 26 points are out"
              checked={prefs.autoFinishHand}
              onChange={onSetAutoFinishHand}
            />
            <Toggle
              label="Haptics"
              hint="Light vibration on play, illegal taps, and big moments"
              checked={prefs.hapticsEnabled}
              onChange={onSetHapticsEnabled}
            />
            <Toggle
              label="Humor mode"
              hint="Chaos narrator: unhinged banter on turns, tricks, passes, Queen, moon, and match end"
              checked={prefs.humorMode}
              onChange={onSetHumorMode}
            />
          </div>
        </section>

        {/* —— Felt —— */}
        <p className="settings__group-label">Table</p>
        <section className="settings__card">
          <div className="settings__card-intro">
            <div className="settings__card-intro-row">
              <h2>Felt design</h2>
              <span className="settings__chip">Look</span>
            </div>
            <p>
              Nine cloths — classic green, jewel tones, desert sand, and OLED night with gold
              hairlines.
            </p>
          </div>
          <div className="felt-grid" role="radiogroup" aria-label="Felt design">
            {FELT_STYLES.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={prefs.feltStyle === f.id}
                className={`felt-swatch ${prefs.feltStyle === f.id ? 'is-active' : ''}`}
                onClick={() => onSetFeltStyle(f.id)}
              >
                <span
                  className="felt-swatch__preview"
                  style={{ background: f.swatch }}
                  aria-hidden
                />
                <span className="felt-swatch__label">{f.label}</span>
              </button>
            ))}
          </div>
        </section>

        <p className="settings__group-label">Cards</p>
        <section className="settings__card">
          <div className="settings__card-intro">
            <div className="settings__card-intro-row">
              <h2>Card backs</h2>
              <span className="settings__chip">Theme</span>
            </div>
            <p>Face-down cards and opponent fans use this design.</p>
          </div>
          <div className="felt-grid" role="radiogroup" aria-label="Card back">
            {CARD_BACKS.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={prefs.cardBack === b.id}
                className={`felt-swatch ${prefs.cardBack === b.id ? 'is-active' : ''}`}
                onClick={() => onSetCardBack(b.id)}
              >
                <span
                  className="felt-swatch__preview felt-swatch__preview--card"
                  style={{ background: b.swatch }}
                  aria-hidden
                />
                <span className="felt-swatch__label">{b.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* —— Rules —— */}
        <p className="settings__group-label">Rules</p>
        <section className="settings__card">
          <div className="settings__card-intro">
            <div className="settings__card-intro-row">
              <h2>Classic Hearts</h2>
              <span className="settings__chip">Standard</span>
            </div>
            <p>House rules and more variants land later.</p>
          </div>

          <div className="settings__inset">
            <label className="settings__row">
              <span className="settings__label">Race to</span>
              <select
                className="settings__select"
                value={r.raceTo}
                onChange={(e) => onUpdateRules({ raceTo: Number(e.target.value) })}
              >
                {[50, 100, 150, 200].map((n) => (
                  <option key={n} value={n}>
                    {n} pts
                  </option>
                ))}
              </select>
            </label>
            <Toggle
              label="2♣ leads first trick"
              checked={r.twoOfClubsLeads}
              onChange={(v) => onUpdateRules({ twoOfClubsLeads: v })}
            />
            <Toggle
              label="No hearts / Q♠ on first trick"
              checked={r.noPointsOnFirstTrick}
              onChange={(v) => onUpdateRules({ noPointsOnFirstTrick: v })}
            />
            <Toggle
              label="Hearts must be broken"
              checked={r.heartsBreak}
              onChange={(v) => onUpdateRules({ heartsBreak: v })}
            />
            <Toggle
              label="Shoot the moon"
              checked={r.shootTheMoon}
              onChange={(v) => onUpdateRules({ shootTheMoon: v })}
            />
          </div>
        </section>

        {/* —— Roadmap —— */}
        <p className="settings__group-label">Roadmap</p>
        <section className="settings__card settings__card--muted">
          <div className="roadmap">
            {[
              { t: 'House rules', d: 'Jack of Diamonds…' },
              { t: 'Online multiplayer', d: 'Friends table' },
              { t: 'Spades & Euchre', d: 'Same engine' },
            ].map((item) => (
              <div key={item.t} className="roadmap__item">
                <span className="roadmap__dot" />
                <div>
                  <div className="roadmap__title">{item.t}</div>
                  <div className="roadmap__desc">{item.d}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="settings__saved">
          <span className="settings__saved-dot" aria-hidden />
          All changes save on this device
        </p>
      </div>

      <CharacterPicker
        open={pickerSeat !== null}
        playerName={
          pickerSeat !== null ? prefs.seats[pickerSeat].name : ''
        }
        selectedId={
          pickerSeat !== null
            ? prefs.seats[pickerSeat].characterId
            : 'ace'
        }
        onSelect={(id) => {
          if (pickerSeat !== null) onUpdateCharacter(pickerSeat, id)
        }}
        onClose={() => setPickerSeat(null)}
      />
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="settings__row">
      <span className="settings__label-block">
        <span className="settings__label">{label}</span>
        {hint && <span className="settings__label-hint">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__knob" />
      </button>
    </label>
  )
}
