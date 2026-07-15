import { loadGame } from './gameSave'
import type { GameId } from './games/registry'
import type { HeartsState } from './games/hearts/engine'
import type { SpadesState } from './games/spades/engine'
import type { EuchreState } from './games/euchre/engine'
import { displayMatchScore } from './games/euchre/scoring'
import { humanSeats, type PassPlayPrefs } from './passAndPlay'
import { loadPrefs } from './prefs'

function passPlayForHint(savedPassPlay?: PassPlayPrefs): PassPlayPrefs {
  if (savedPassPlay) return savedPassPlay
  const prefs = loadPrefs()
  return { passAndPlay: prefs.passAndPlay, humanSeats: prefs.humanSeats }
}

function saveScoreHint(
  gameId: GameId,
  s: HeartsState | SpadesState | EuchreState,
  passPlay: PassPlayPrefs,
): string | null {
  if (gameId === 'hearts') {
    const h = s as HeartsState
    const seats = humanSeats(passPlay)
    const scores = seats
      .map((seat) => h.players[seat]?.totalScore)
      .filter((n): n is number => typeof n === 'number')
    if (scores.length === 0) return null
    const lead = Math.min(...scores)
    return seats.length > 1 ? `lead ${lead} pts` : `${lead} pts`
  }

  if (gameId === 'spades') {
    const sp = s as SpadesState
    return `NS ${sp.teamScores.ns} · EW ${sp.teamScores.ew}`
  }

  if (gameId === 'euchre') {
    const e = s as EuchreState
    const raceTo = e.rules.raceTo
    const ns = displayMatchScore(e.teamScores.ns, raceTo)
    const ew = displayMatchScore(e.teamScores.ew, raceTo)
    return `NS ${ns} · EW ${ew}`
  }

  return null
}

/** Short label for an in-progress save — shown on home game tiles. */
export function savePhaseHint(gameId: GameId): string | null {
  const saved = loadGame(gameId)
  if (!saved) return null
  const s = saved.state
  const hand = 'handNumber' in s && typeof s.handNumber === 'number' ? s.handNumber : 0
  let phase = 'In progress'

  if (gameId === 'hearts') {
    const h = s as HeartsState
    if (h.phase === 'passing') phase = `Hand ${hand} · passing`
    else if (h.phase === 'receiving') phase = `Hand ${hand} · receiving`
    else if (h.phase === 'playing' || h.phase === 'trick_reveal') phase = `Hand ${hand} · in play`
    else if (h.phase === 'hand_result') phase = `Hand ${hand} · scoring`
  } else if (gameId === 'spades') {
    const sp = s as SpadesState
    if (sp.phase === 'bidding') phase = `Hand ${hand} · bidding`
    else if (sp.phase === 'playing' || sp.phase === 'trick_reveal') phase = `Hand ${hand} · in play`
    else if (sp.phase === 'hand_result') phase = `Hand ${hand} · scoring`
  } else if (gameId === 'euchre') {
    const e = s as EuchreState
    if (e.phase === 'bidding') phase = `Hand ${hand} · bidding`
    else if (e.phase === 'discard') phase = `Hand ${hand} · dealer discard`
    else if (e.phase === 'loner_choice') phase = `Hand ${hand} · loner choice`
    else if (e.phase === 'playing' || e.phase === 'trick_reveal') phase = `Hand ${hand} · in play`
    else if (e.phase === 'hand_result') phase = `Hand ${hand} · scoring`
  }

  const score = saveScoreHint(gameId, s, passPlayForHint(saved.passPlay))
  return score ? `${phase} · ${score}` : phase
}