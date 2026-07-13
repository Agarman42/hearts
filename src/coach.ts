import { coachKey } from './storageKeys'

const KEY = coachKey('hearts')

export function hasSeenCoach(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

export function markCoachSeen(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* ignore */
  }
}
