/**
 * Table feedback — haptics + optional synthesized sounds (Web Audio).
 * Gated by prefs.hapticsEnabled and prefs.soundEnabled.
 */

export type FxPrefs = {
  soundEnabled?: boolean
  hapticsEnabled: boolean
}

let audioCtx: AudioContext | null = null
let soundVolumeScale = 0.8

/** Called from App when prefs.soundVolume changes. */
export function setSoundVolumeScale(volumePercent: number): void {
  soundVolumeScale = Math.max(0, Math.min(1, volumePercent / 100))
}

function scaledGain(gain: number): number {
  return gain * soundVolumeScale
}

function ensureAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return null
      audioCtx = new Ctx()
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

function tone(
  freq: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number; attack?: number } = {},
) {
  const ctx = ensureAudio()
  if (!ctx) return
  const { type = 'sine', gain = 0.06, attack = 0.008 } = opts
  const peakGain = scaledGain(gain)
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  const t = ctx.currentTime
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peakGain, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

function chord(freqs: number[], duration: number, gain = 0.04) {
  for (const f of freqs) tone(f, duration, { gain })
}

function noiseBurst(duration: number, gain = 0.025) {
  const ctx = ensureAudio()
  if (!ctx) return
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  const t = ctx.currentTime
  src.buffer = buffer
  g.gain.setValueAtTime(scaledGain(gain), t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  src.connect(g)
  g.connect(ctx.destination)
  src.start(t)
}

function playSound(kind: string, prefs: FxPrefs) {
  if (!prefs.soundEnabled) return
  switch (kind) {
    case 'card':
      tone(880, 0.05, { type: 'triangle', gain: 0.035 })
      break
    case 'pass':
      tone(520, 0.06, { gain: 0.03 })
      break
    case 'passConfirm':
      chord([523, 659, 784], 0.14, 0.035)
      break
    case 'trick':
      chord([392, 494, 587], 0.18, 0.045)
      break
    case 'hearts':
      tone(220, 0.22, { type: 'sawtooth', gain: 0.04 })
      break
    case 'queen':
      tone(165, 0.28, { type: 'square', gain: 0.035 })
      tone(110, 0.32, { gain: 0.03 })
      break
    case 'illegal':
      tone(140, 0.12, { type: 'sawtooth', gain: 0.05 })
      break
    case 'turn':
      tone(660, 0.07, { type: 'triangle', gain: 0.04 })
      break
    case 'deal':
      noiseBurst(0.12, 0.02)
      tone(330, 0.08, { gain: 0.025 })
      break
    case 'handEnd':
      chord([262, 330, 392, 523], 0.35, 0.04)
      break
    case 'spades':
      tone(180, 0.2, { type: 'sawtooth', gain: 0.04 })
      break
    case 'nil':
      chord([440, 554, 659], 0.25, 0.04)
      break
    case 'unlock':
      chord([523, 659, 784, 1047], 0.4, 0.045)
      break
    case 'euchre':
      chord([349, 440, 523], 0.2, 0.04)
      break
    case 'march':
      chord([392, 494, 587, 740], 0.3, 0.05)
      break
    default:
      break
  }
}

function vibe(pattern: number | number[], prefs: FxPrefs) {
  if (!prefs.hapticsEnabled) return
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  } catch {
    /* unsupported */
  }
}

function fx(kind: string, pattern: number | number[], prefs: FxPrefs) {
  vibe(pattern, prefs)
  playSound(kind, prefs)
}

export function fxPlayCard(prefs: FxPrefs) {
  fx('card', 12, prefs)
}

export function fxPassCard(prefs: FxPrefs) {
  fx('pass', 8, prefs)
}

export function fxPassConfirm(prefs: FxPrefs) {
  fx('passConfirm', [10, 30, 14], prefs)
}

export function fxTrickWin(prefs: FxPrefs) {
  fx('trick', [16, 40, 20], prefs)
}

export function fxHeartsBroken(prefs: FxPrefs) {
  fx('hearts', [20, 40, 30], prefs)
}

export function fxQueenTaken(prefs: FxPrefs) {
  fx('queen', [30, 50, 40, 50, 60], prefs)
}

export function fxIllegal(prefs: FxPrefs) {
  fx('illegal', 28, prefs)
}

export function fxYourTurn(prefs: FxPrefs) {
  fx('turn', 10, prefs)
}

export function fxDeal(prefs: FxPrefs) {
  fx('deal', [6, 20, 6, 20, 8], prefs)
}

export function fxHandEnd(prefs: FxPrefs) {
  fx('handEnd', [12, 30, 12, 30, 18], prefs)
}

export function fxSpadesBroken(prefs: FxPrefs) {
  fx('spades', [18, 36, 24], prefs)
}

export function fxNilMade(prefs: FxPrefs) {
  fx('nil', [14, 28, 14, 40, 20], prefs)
}

export function fxUnlock(prefs: FxPrefs) {
  fx('unlock', [8, 24, 8, 32, 16], prefs)
}

export function fxEuchreTrump(prefs: FxPrefs) {
  fx('euchre', [12, 28, 12], prefs)
}

export function fxEuchreMarch(prefs: FxPrefs) {
  fx('march', [16, 32, 16, 40, 24], prefs)
}

export function fxEuchreEuchred(prefs: FxPrefs) {
  fx('euchre', [20, 36, 20, 44, 28], prefs)
}