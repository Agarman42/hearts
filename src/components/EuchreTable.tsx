import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type { EuchreState } from '../games/euchre/engine'

import { trickWinner } from '../games/euchre/rules'
import { sortEuchreHand } from '../games/euchre/hand'
import { Card, Seat } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import { partnershipOf } from '../core/partnership'
import { seatViewsFromEuchre } from '../games/tablePlayer'
import type { GameAction } from '../multiplayer/protocol'
import { engineSeatFromSlot, screenSlot } from '../multiplayer/seats'
import { PlayerSeat } from './PlayerSeat'
import { GoalHud, type GoalHudItem } from './GoalHud'
import { Hand } from './Hand'
import { TrickArea } from './TrickArea'
import { CardView } from './CardView'
import { TableHeader } from './TableHeader'
import { TableMenu } from './TableMenu'
import { EuchreTrumpPanel } from './EuchreTrumpPanel'
import { EuchreLonerPanel } from './EuchreLonerPanel'
import { EuchreScoreboard } from './EuchreScoreboard'
import { EuchreOverlay } from './EuchreOverlay'
import { EuchreDramaBanners } from './EuchreDramaBanners'
import { LastTrickModal } from './LastTrickModal'
import { AchievementToast } from './AchievementToast'
import { Confetti } from './Confetti'
import { SetReaction } from './SetReaction'
import { CoachTips } from './CoachTips'
import { Toast } from './Toast'
import { gameCoachTips, hasSeenCoach } from '../coach'
import {
  CardFlight,
  type FlightRect,
  rectOf,
  seatOriginRect,
  trickSeatRect,
} from './CardFlight'
import { usePassReady } from '../hooks/usePassReady'
import {
  humanPartnershipTeam,
  isHumanControlled,
  uiSeat,
  type HumanSeatsConfig,
} from '../passAndPlay'
import { SPEED_TIMING, type GameSpeed } from '../prefs'
import { PassDeviceBanner } from './PassDeviceBanner'
import {
  humorEuchreAiThinking,
  humorEuchreIllegal,
  humorEuchreLoner,
  humorEuchreStick,
  humorEuchreTrickWin,
  humorEuchreTrump,

  humorActive,
  withHumor,
} from '../humor'
import {
  fxDeal,
  fxEuchreTrump,
  fxHandEnd,
  fxIllegal,
  fxPlayCard,
  fxTrickWin,
  fxYourTurn,
} from '../fx'
import './Table.css'
import './Overlay.css'
import { EuchrePlayerHud } from './EuchrePlayerHud'

import { EuchreDiscardPanel } from './EuchreDiscardPanel'
import { EuchreTrumpCallRecap } from './EuchreTrumpCallRecap'
import { EuchreLonerRecap } from './EuchreLonerRecap'
import { EuchreDiscardRecap } from './EuchreDiscardRecap'
import { partnerOf } from '../core/partnership'
import { lonerBlockedNearWin } from '../games/euchre/scoring'
import './EuchreTrumpPanel.css'
import './EuchreTable.css'

interface Props {
  state: EuchreState
  legal: Card[]
  feltStyle?: string
  hapticsEnabled?: boolean
  soundEnabled?: boolean
  humorMode?: boolean
  leftHandLayout?: boolean
  passAndPlay?: boolean
  humanSeats?: HumanSeatsConfig
  gameSpeed?: GameSpeed
  coachTipsEnabled?: boolean
  skipRecaps?: boolean
  canUndo?: boolean
  onUndoPlay?: () => void
  onCardClick: (card: import('../core/types').Card) => void
  onPass: () => void
  onOrderUp: () => void
  onNameTrump: (suit: import('../core/types').Suit) => void
  onGoAlone: () => void
  onWithPartner: () => void
  onAckTrumpCall: () => void
  onAckLonerChoice: () => void
  onAckDiscardComplete: () => void
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  onSettings: () => void
  onStartOver: () => void
  onAbandon: () => void
  achievementToast?: import('../hooks/useAchievementToast').ToastUnlock | null
  onAchievementDone?: () => void
  /** Online: your engine seat (drawn as South). */
  mySeat?: Seat
  online?: boolean
  onOnlineAction?: (action: GameAction) => void
  /** Host-only rematch after an online match ends. */
  canRematch?: boolean
  /** Server `error` while the table is mounted (illegal play, not your turn). */
  onlineWarning?: string | null
}

interface FlightState {
  kind: 'play-ai' | 'play-in'
  card: Card
  from: FlightRect
  to: FlightRect
  durationMs: number
}
