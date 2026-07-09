/**
 * Haptics only (sound removed by design).
 * Gated by prefs.hapticsEnabled.
 */

export type FxPrefs = {
  soundEnabled?: boolean
  hapticsEnabled: boolean
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

export function fxPlayCard(prefs: FxPrefs) {
  vibe(12, prefs)
}

export function fxPassCard(prefs: FxPrefs) {
  vibe(8, prefs)
}

export function fxPassConfirm(prefs: FxPrefs) {
  vibe([10, 30, 14], prefs)
}

export function fxTrickWin(prefs: FxPrefs) {
  vibe([16, 40, 20], prefs)
}

export function fxHeartsBroken(prefs: FxPrefs) {
  vibe([20, 40, 30], prefs)
}

export function fxQueenTaken(prefs: FxPrefs) {
  vibe([30, 50, 40, 50, 60], prefs)
}

export function fxIllegal(prefs: FxPrefs) {
  vibe(28, prefs)
}

export function fxYourTurn(prefs: FxPrefs) {
  vibe(10, prefs)
}

export function fxDeal(prefs: FxPrefs) {
  vibe([6, 20, 6, 20, 8], prefs)
}

export function fxHandEnd(prefs: FxPrefs) {
  vibe([12, 30, 12, 30, 18], prefs)
}
