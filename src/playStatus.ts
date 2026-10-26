/** Plain pass instruction. Direction is left, right, or across. */
export function heartsPassStatus(opts: {
  passCount: number
  direction: string
  confirmed: boolean
}): string {
  if (opts.confirmed) return 'Waiting for the others to pass'
  const dir = opts.direction === 'hold' ? '' : ` ${opts.direction}`
  return `Pass ${opts.passCount}${dir}`
}

/** What every phone should read while Euchre trump is being named. */
export function euchreBidStatus(opts: {
  yourTurn: boolean
  name: string
  round: 1 | 2
  mustName: boolean
}): string {
  if (opts.mustName) {
    return opts.yourTurn
      ? 'Stick the dealer — you have to name trump'
      : `${opts.name} has to name trump`
  }
  if (opts.yourTurn) {
    return opts.round === 1 ? 'Your bid — order up or pass' : 'Your bid — name trump or pass'
  }
  const action = opts.round === 1 ? 'order up or pass' : 'name trump or pass'
  return `${opts.name}'s bid — ${action}`
}

/** What the status line should say while a seat is choosing a card. */
export type SeatPlayCue =
  | { kind: 'you' }
  | { kind: 'pass'; text: string }
  | { kind: 'wait'; text: string }
  | { kind: 'think'; name: string }

export function seatPlayCue(input: {
  whoseTurn: number
  you: number
  name: string
  isHuman: boolean
  online: boolean
}): SeatPlayCue {
  if (input.whoseTurn === input.you) return { kind: 'you' }
  if (input.isHuman && !input.online) {
    return { kind: 'pass', text: `Pass the device to ${input.name}` }
  }
  if (input.isHuman) return { kind: 'wait', text: `Waiting for ${input.name}` }
  return { kind: 'think', name: input.name }
}
