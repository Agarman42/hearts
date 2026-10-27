/** Copy for friends-table states. The client draws these from state it already has. */

export function awayLine(name: string): string {
  return `${name} stepped away.`
}

export function linkLine(seenLive: boolean): string {
  return seenLive ? 'Reconnecting…' : 'Connecting…'
}

export function backLine(): string {
  return 'Back at the table.'
}

export function partnerLine(): string {
  return 'You and North are partners.'
}

export function computerSeatLabel(): string {
  return 'Computer'
}

export function clockLine(isHost: boolean): string {
  return isHost ? 'You set how long a turn lasts.' : 'The host sets the turn limit.'
}

export function pausedRoomsLine(): string {
  return 'Rooms are paused. Try again in a little while.'
}

export function tooManyRoomsLine(): string {
  return 'Too many rooms from this network. Try again in a little while.'
}

export function watchingLine(): string {
  return 'You’re watching. The computer has this seat.'
}
