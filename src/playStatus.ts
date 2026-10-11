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
