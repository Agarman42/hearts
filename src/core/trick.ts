import type { Seat } from './types'
import type { TrickPlay } from '../games/types'

export type TrickWinnerResolver = (plays: TrickPlay[]) => Seat