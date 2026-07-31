/**
 * Compact contract / progress strip under the table header area.
 * Spades: team books vs bid · bags
 * Euchre: makers' tricks · race score
 * Hearts: hand points this round
 */
import './GoalHud.css'

export type GoalHudItem = {
  id: string
  label: string
  value: string
  /** visual emphasis */
  tone?: 'default' | 'hot' | 'good' | 'warn'
}

interface Props {
  items: GoalHudItem[]
  ariaLabel?: string
}

export function GoalHud({ items, ariaLabel = 'Hand goals' }: Props) {
  if (items.length === 0) return null
  return (
    <div className="goal-hud" role="status" aria-label={ariaLabel}>
      {items.map((item) => (
        <div
          key={item.id}
          className={['goal-hud__chip', item.tone ? `goal-hud__chip--${item.tone}` : '']
            .filter(Boolean)
            .join(' ')}
        >
          <span className="goal-hud__label">{item.label}</span>
          <span className="goal-hud__value">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
