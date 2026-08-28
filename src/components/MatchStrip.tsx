import type { ReactNode } from 'react'
import type { Seat } from '../core/types'
import './MatchStrip.css'

export interface MatchStripChip {
  text: string
  tone?: 'gold' | 'dim' | 'hot'
}

interface Props {
  kicker?: string
  chips: MatchStripChip[]
  status?: string | null
  children?: ReactNode
}

export function matchTurnStatus(
  whoseTurn: Seat | null | undefined,
  viewerSeat: Seat,
  names: readonly string[],
  yours = 'Your play',
): string | null {
  if (whoseTurn == null) return null
  if (whoseTurn === viewerSeat) return yours
  return `Waiting on ${names[whoseTurn] ?? 'the table'}`
}

export function MatchStrip({ kicker, chips, status, children }: Props) {
  if (chips.length === 0 && !status && !children && !kicker) return null
  return (
    <div className="match-strip" role="status">
      {kicker && <span className="match-strip__kicker">{kicker}</span>}
      <ul className="match-strip__chips">
        {chips.map((c, i) => (
          <li
            key={`${c.text}-${i}`}
            className={['match-strip__chip', c.tone ? `match-strip__chip--${c.tone}` : '']
              .filter(Boolean)
              .join(' ')}
          >
            {c.text}
          </li>
        ))}
      </ul>
      {children}
      {status && <p className="match-strip__status">{status}</p>}
    </div>
  )
}
