import { useState } from 'react'
import { AiDifficulty, Seat, SEATS } from '../core/types'
import type { HeartsRulesConfig } from '../games/hearts/types'
import type { SpadesRulesConfig } from '../games/spades/types'
import type { EuchreRulesConfig } from '../games/euchre/types'
import { GAMES, gameMeta, type GameId } from '../games/registry'
import {
  CARD_BACKS,
  CARD_SIZES,
  CardBackStyle,
  CardSize,
  FELT_STYLES,
  FeltStyle,
  GameSpeed,
  HumorIntensity,
  SPEED_LABELS,
  UserPrefs,
} from '../prefs'
import type { MoonScoringMode } from '../games/hearts/types'
import { activeHeartsPresetId, HEARTS_PRESETS } from '../games/hearts/presets'
import { clearCoachSeen } from '../coach'
import {
  applyCareerImport,
  downloadCareerExport,
  parseCareerImport,
} from '../careerExport'
import { Avatar } from './Avatar'
import { CharacterPicker } from './CharacterPicker'
import './Settings.css'

interface Props {
  prefs: UserPrefs
  activeGame?: GameId
  onBack: () => void
  onStats?: () => void
  onUpdateDifficulty: (seat: Seat, d: AiDifficulty) => void
  onUpdateName: (seat: Seat, name: string) => void
  onUpdateCharacter: (seat: Seat, characterId: string) => void
  onUpdateRules: (rules: Partial<HeartsRulesConfig>) => void
  onUpdateSpadesRules?: (rules: Partial<SpadesRulesConfig>) => void
  onUpdateEuchreRules?: (rules: Partial<EuchreRulesConfig>) => void
  onSetGameSpeed: (speed: GameSpeed) => void
  onSetAutoFinishHand: (v: boolean) => void
  onSetFeltStyle: (felt: FeltStyle) => void
  onSetCardBack: (back: CardBackStyle) => void
  onSetHapticsEnabled: (v: boolean) => void
  onSetSoundEnabled: (v: boolean) => void
  onSetSoundVolume: (v: number) => void
  onSetShowCareerBar: (v: boolean) => void
  onSetShowDailyChallenges: (v: boolean) => void
  onSetShowRecentMatches: (v: boolean) => void
  onSetLeftHandLayout: (v: boolean) => void
  onSetHumorMode: (v: boolean) => void
  onSetHumorIntensity: (v: HumorIntensity) => void
  onSetCoachTipsEnabled: (v: boolean) => void
  onSetReduceMotion: (v: boolean) => void
  onSetCardSize: (size: CardSize) => void
  onSetPassAndPlay: (v: boolean) => void
  onSetHumanSeat: (seat: Seat, human: boolean) => void
}

const DIFFS: AiDifficulty[] = ['easy', 'medium', 'hard']
const SPEEDS: GameSpeed[] = ['instant', 'fast', 'normal', 'slow']

export function Settings({
  prefs,
  activeGame = 'hearts',
  onBack,
  onStats,
  onUpdateDifficulty,
  onUpdateName,
  onUpdateCharacter,
  onUpdateRules,
  onUpdateSpadesRules,
  onUpdateEuchreRules,
  onSetGameSpeed,
  onSetAutoFinishHand,
  onSetFeltStyle,
  onSetCardBack,
  onSetHapticsEnabled,
  onSetSoundEnabled,
  onSetSoundVolume,
  onSetShowCareerBar,
  onSetShowDailyChallenges,
  onSetShowRecentMatches,
  onSetLeftHandLayout,
  onSetHumorMode,
  onSetHumorIntensity,
  onSetCoachTipsEnabled,
  onSetReduceMotion,
  onSetCardSize,
  onSetPassAndPlay,
  onSetHumanSeat,
}: Props) {
  const r = prefs.rules
  const sr = prefs.spadesRules
  const er = prefs.euchreRules
  const [viewGame, setViewGame] = useState<GameId>(activeGame)
  const viewMeta = gameMeta(viewGame)
  const [pickerSeat, setPickerSeat] = useState<Seat | null>(null)
  const [coachReplayMsg, setCoachReplayMsg] = useState<string | null>(null)
  const activeHeartsPreset = activeHeartsPresetId(r)

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
              {viewMeta.icon}
            </span>
            {viewMeta.title}
          </span>
          <h1>Settings</h1>
        </div>
        <div className="settings__header-spacer" aria-hidden />
      </header>

      <div className="settings__body">
        {onStats && (
          <button type="button" className="settings__stats-link btn btn--ghost" onClick={onStats}>
            📊 Career stats & achievements
          </button>
        )}

        {/* —— Players —— */}
        <p className="settings__group-label">Table</p>
        <section className="settings__card">
          <div className="settings__card-intro">
            <h2>Players</h2>
            <p>
              Tap a name to rename anyone — including Angie, Scott, and Heather. Avatars and AI
              skill save automatically. Hard AI uses moon defense, bag math, and Euchre trump pulls.
            </p>
          </div>

          <Toggle
            label="Pass and play"
            hint="Hot-seat mode — pass the device when it's another human's turn"
            checked={prefs.passAndPlay}
            onChange={onSetPassAndPlay}
          />

          {prefs.passAndPlay && (
            <p className="settings__pass-hint">
              Seat 1 (south) is always you. Check extra seats for friends at the table.
            </p>
          )}

          <div className="roster">
            {SEATS.map((seat) => {
              const isHuman =
                seat === 0 || (prefs.passAndPlay && prefs.humanSeats[seat])
              return (
                <div key={seat} className="roster__row">
                  <button
                    type="button"
                    className="roster__avatar-btn"
                    onClick={() => setPickerSeat(seat)}
                    aria-label={`Change avatar for ${prefs.seats[seat].name}`}
                  >
                    <Avatar characterId={prefs.seats[seat].characterId} size="lg" />
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
                        {seat === 0
                          ? 'You · south'
                          : isHuman
                            ? 'Human · pass device'
                            : 'AI · tap name to edit'}
                      </span>
                    </div>

                    {prefs.passAndPlay && seat !== 0 && (
                      <label className="roster__human-toggle">
                        <input
                          type="checkbox"
                          checked={prefs.humanSeats[seat]}
                          onChange={(e) => onSetHumanSeat(seat, e.target.checked)}
                        />
                        <span>Human player</span>
                      </label>
                    )}

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
              label="Career bar on home"
              hint="Wins, trophies, and goals strip below the game picker"
              checked={prefs.showCareerBar}
              onChange={onSetShowCareerBar}
            />
            <Toggle
              label="Daily challenges on home"
              hint="Compact today's challenges button with completion count"
              checked={prefs.showDailyChallenges}
              onChange={onSetShowDailyChallenges}
            />
            <Toggle
              label="Recent matches on home"
              hint="Latest wins and losses across Hearts, Spades, and Euchre"
              checked={prefs.showRecentMatches}
              onChange={onSetShowRecentMatches}
            />
            {viewGame === 'hearts' && (
              <Toggle
                label="Auto-finish hand"
                hint="Buzz through remaining cards after all 26 points are out"
                checked={prefs.autoFinishHand}
                onChange={onSetAutoFinishHand}
              />
            )}
            <Toggle
              label="Haptics"
              hint="Light vibration on play, illegal taps, and big moments"
              checked={prefs.hapticsEnabled}
              onChange={onSetHapticsEnabled}
            />
            <Toggle
              label="Sound"
              hint="Soft table cues — card play, tricks, drama, and unlocks"
              checked={prefs.soundEnabled}
              onChange={onSetSoundEnabled}
            />
            {prefs.soundEnabled && (
              <label className="settings__row settings__row--volume">
                <span className="settings__label-block">
                  <span className="settings__label">Volume</span>
                  <span className="settings__label-hint">{prefs.soundVolume}%</span>
                </span>
                <input
                  type="range"
                  className="settings__range"
                  min={0}
                  max={100}
                  step={5}
                  value={prefs.soundVolume}
                  onChange={(e) => onSetSoundVolume(Number(e.target.value))}
                  aria-label="Sound volume"
                />
              </label>
            )}
            <Toggle
              label="Humor mode"
              hint="Table banter on turns, tricks, passes, and big moments"
              checked={prefs.humorMode}
              onChange={onSetHumorMode}
            />
            {prefs.humorMode && (
              <label className="settings__row">
                <span className="settings__label">Humor intensity</span>
                <select
                  className="settings__select"
                  aria-label="Humor intensity"
                  value={prefs.humorIntensity}
                  onChange={(e) => onSetHumorIntensity(e.target.value as HumorIntensity)}
                >
                  <option value="mild">Mild — occasional quips</option>
                  <option value="chaos">Chaos — full narrator</option>
                </select>
              </label>
            )}
            <Toggle
              label="Left-hand layout"
              hint="Anchor your hand to the left — tap or drag right/up to play (phones)"
              checked={prefs.leftHandLayout}
              onChange={onSetLeftHandLayout}
            />
            <Toggle
              label="Coach tips"
              hint="First-play how-to dialogs per game — turn off when you know the ropes"
              checked={prefs.coachTipsEnabled}
              onChange={onSetCoachTipsEnabled}
            />
            <Toggle
              label="Reduce motion"
              hint="Shorten card flights and table animations (also respects system accessibility)"
              checked={prefs.reduceMotion}
              onChange={onSetReduceMotion}
            />
            <button
              type="button"
              className="btn btn--ghost settings__coach-replay"
              onClick={() => {
                clearCoachSeen(viewGame)
                setCoachReplayMsg(`Coach tips will show next time you play ${viewMeta.title}.`)
                window.setTimeout(() => setCoachReplayMsg(null), 3200)
              }}
            >
              Replay {viewMeta.title} coach tips
            </button>
            {coachReplayMsg && (
              <p className="settings__coach-replay-msg" role="status">
                {coachReplayMsg}
              </p>
            )}
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
              <h2>Card size</h2>
              <span className="settings__chip">Readability</span>
            </div>
            <p>Scale your hand and trick cards — helpful on phones or for larger type.</p>
          </div>
          <div className="pace-rail" role="radiogroup" aria-label="Card size">
            {CARD_SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={prefs.cardSize === s.id}
                className={`pace-rail__btn ${prefs.cardSize === s.id ? 'is-active' : ''}`}
                onClick={() => onSetCardSize(s.id)}
              >
                <span className="pace-rail__name">{s.label}</span>
              </button>
            ))}
          </div>
        </section>

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

        <p className="settings__group-label">Game rules</p>
        <section className="settings__card settings__card--compact">
          <div className="settings__card-intro">
            <h2>Switch game</h2>
            <p>Edit house rules for Hearts, Spades, or Euchre without returning to the main menu.</p>
          </div>
          <div className="game-switch" role="tablist" aria-label="Game rules">
            {GAMES.map((g) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={viewGame === g.id}
                className={`game-switch__btn ${viewGame === g.id ? 'is-active' : ''}`}
                onClick={() => setViewGame(g.id)}
              >
                <span className="game-switch__icon" aria-hidden>
                  {g.icon}
                </span>
                <span className="game-switch__name">{g.title}</span>
              </button>
            ))}
          </div>
        </section>

        {viewGame === 'hearts' && (
          <>
            <p className="settings__group-label">Rules · Hearts</p>
            <section className="settings__card">
              <div className="settings__card-intro">
                <div className="settings__card-intro-row">
                  <h2>Classic Hearts</h2>
                  <span className="settings__chip">Standard</span>
                </div>
                <p>Pick a preset or mix your own house rules below.</p>
              </div>

              <div className="hearts-presets" role="radiogroup" aria-label="Hearts presets">
                {HEARTS_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={activeHeartsPreset === preset.id}
                    className={`hearts-presets__btn ${
                      activeHeartsPreset === preset.id ? 'is-active' : ''
                    }`}
                    onClick={() => onUpdateRules(preset.rules)}
                  >
                    <span className="hearts-presets__name">{preset.label}</span>
                    <span className="hearts-presets__desc">{preset.description}</span>
                  </button>
                ))}
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
                <label className="settings__row">
                  <span className="settings__label">Cards to pass</span>
                  <select
                    className="settings__select"
                    value={r.passCount}
                    onChange={(e) => onUpdateRules({ passCount: Number(e.target.value) })}
                  >
                    {[2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} cards
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
                {r.shootTheMoon && (
                  <label className="settings__row">
                    <span className="settings__label">Moon scoring</span>
                    <select
                      className="settings__select"
                      value={r.moonScoring}
                      onChange={(e) =>
                        onUpdateRules({ moonScoring: e.target.value as MoonScoringMode })
                      }
                    >
                      <option value="classic">Classic — others +26</option>
                      <option value="sun">Shoot the sun — others +39</option>
                      <option value="noRedistribute">No redistribute — shooter keeps 26</option>
                    </select>
                  </label>
                )}
                <Toggle
                  label="Jack of diamonds"
                  hint="J♦ subtracts 10 from whoever takes the trick"
                  checked={r.jackOfDiamonds}
                  onChange={(v) => onUpdateRules({ jackOfDiamonds: v })}
                />
              </div>
            </section>
          </>
        )}

        {viewGame === 'spades' && onUpdateSpadesRules && (
          <>
            <p className="settings__group-label">Rules · Spades</p>
            <section className="settings__card">
              <div className="settings__card-intro">
                <div className="settings__card-intro-row">
                  <h2>American Spades</h2>
                  <span className="settings__chip">Partners</span>
                </div>
                <p>Standard scoring with optional house rules.</p>
              </div>

              <div className="settings__inset">
                <label className="settings__row">
                  <span className="settings__label">Race to</span>
                  <select
                    className="settings__select"
                    value={sr.raceTo}
                    onChange={(e) =>
                      onUpdateSpadesRules({ raceTo: Number(e.target.value) })
                    }
                  >
                    {[250, 300, 500].map((n) => (
                      <option key={n} value={n}>
                        {n} pts
                      </option>
                    ))}
                  </select>
                </label>
                <Toggle
                  label="Nil bids"
                  hint="Bid zero tricks for +100 / −100"
                  checked={sr.nilBids}
                  onChange={(v) => onUpdateSpadesRules({ nilBids: v })}
                />
                <Toggle
                  label="Blind nil"
                  hint="Bid nil before seeing your hand — +200 / −200"
                  checked={sr.blindNil}
                  onChange={(v) => onUpdateSpadesRules({ blindNil: v })}
                />
                <Toggle
                  label="Bag penalty"
                  hint="Every N overtricks costs bag penalty points"
                  checked={sr.bagPenalty}
                  onChange={(v) => onUpdateSpadesRules({ bagPenalty: v })}
                />
                {sr.bagPenalty && (
                  <>
                    <label className="settings__row">
                      <span className="settings__label">Bags per penalty</span>
                      <select
                        className="settings__select"
                        value={sr.bagsPerPenalty}
                        onChange={(e) =>
                          onUpdateSpadesRules({ bagsPerPenalty: Number(e.target.value) })
                        }
                      >
                        {[5, 7, 10].map((n) => (
                          <option key={n} value={n}>
                            {n} bags
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="settings__row">
                      <span className="settings__label">Penalty points</span>
                      <select
                        className="settings__select"
                        value={sr.bagPenaltyPoints}
                        onChange={(e) =>
                          onUpdateSpadesRules({ bagPenaltyPoints: Number(e.target.value) })
                        }
                      >
                        {[50, 100, 150].map((n) => (
                          <option key={n} value={n}>
                            −{n} pts
                          </option>
                        ))}
                      </select>
                    </label>
                    <Toggle
                      label="Bag mercy"
                      hint="Hitting the bag threshold resets count without −100 (casual house rule)"
                      checked={sr.bagMercy}
                      onChange={(v) => onUpdateSpadesRules({ bagMercy: v })}
                    />
                  </>
                )}
              </div>
            </section>
          </>
        )}

        {viewGame === 'euchre' && onUpdateEuchreRules && (
          <>
            <p className="settings__group-label">Rules · Euchre</p>
            <section className="settings__card">
              <div className="settings__card-intro">
                <div className="settings__card-intro-row">
                  <h2>American Euchre</h2>
                  <span className="settings__chip">Partners</span>
                </div>
              </div>
              <div className="settings__inset">
                <label className="settings__row">
                  <span className="settings__label">Race to</span>
                  <select
                    className="settings__select"
                    value={er.raceTo}
                    onChange={(e) =>
                      onUpdateEuchreRules({ raceTo: Number(e.target.value) })
                    }
                  >
                    {[10, 11, 15].map((n) => (
                      <option key={n} value={n}>
                        {n} pts
                      </option>
                    ))}
                  </select>
                </label>
                <Toggle
                  label="Stick the dealer"
                  hint="Dealer must name trump if everyone passes twice"
                  checked={er.stickTheDealer}
                  onChange={(v) => onUpdateEuchreRules({ stickTheDealer: v })}
                />
                <Toggle
                  label="Loners"
                  hint="Maker may go alone — march for 4 points, partner sits out"
                  checked={er.lonersEnabled}
                  onChange={(v) => onUpdateEuchreRules({ lonersEnabled: v })}
                />
                <Toggle
                  label="Farmer's hand (loose)"
                  hint="If dealer's partner holds only 9s and 10s, they must order up in round 1"
                  checked={er.farmersHand}
                  onChange={(v) => onUpdateEuchreRules({ farmersHand: v })}
                />
                <Toggle
                  label="Screw the dealer"
                  hint="When stick-the-dealer fires, dealer must go alone"
                  checked={er.screwTheDealer}
                  onChange={(v) => onUpdateEuchreRules({ screwTheDealer: v })}
                />
              </div>
            </section>
          </>
        )}

        {/* —— Career backup —— */}
        <p className="settings__group-label">Career backup</p>
        <section className="settings__card">
          <p className="settings__hint" style={{ marginBottom: '0.75rem' }}>
            Download a JSON snapshot of stats, goals, and trophies — or restore from a
            backup file.
          </p>
          <div className="settings__row settings__row--actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => downloadCareerExport()}
            >
              Download JSON
            </button>
            <label className="btn btn--ghost" style={{ cursor: 'pointer' }}>
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  try {
                    const text = await file.text()
                    const parsed = parseCareerImport(text)
                    if (!parsed.ok) {
                      window.alert(parsed.error ?? 'Invalid career file')
                      return
                    }
                    const mode = window.confirm(
                      'Merge with existing career data?\n\nOK = merge · Cancel = replace all',
                    )
                      ? 'merge'
                      : 'replace'
                    applyCareerImport(parsed.data, mode)
                    window.alert(
                      mode === 'merge'
                        ? 'Career data merged.'
                        : 'Career data replaced from backup.',
                    )
                  } catch {
                    window.alert('Could not read that file.')
                  }
                }}
              />
            </label>
          </div>
        </section>

        {/* —— Roadmap —— */}
        <p className="settings__group-label">Roadmap</p>
        <section className="settings__card settings__card--muted">
          <div className="roadmap">
            {[
              { t: 'Online multiplayer', d: 'Friends table over the internet — next up' },
              { t: 'Polish & parity', d: 'Pass-and-play overlays · coach tips · multi-seat labels ✓' },
              { t: 'Pass and play', d: 'Hot-seat mode · multi-human seats ✓' },
              { t: 'Sound & themes', d: 'Table sounds · 9 felts · 6 card backs ✓' },
              { t: 'More achievements', d: 'Cross-game trophies · 12 global paths ✓' },
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
