import { useMemo } from 'react'
import './Confetti.css'

interface Props {
  /** 'moon' | 'win' | 'party' */
  variant?: 'moon' | 'win' | 'party'
  /** Piece count — auto-scaled up for celebrations */
  count?: number
  intensity?: 'normal' | 'epic'
}

/**
 * CSS confetti burst — layered fall + side sprays for win/moon moments.
 */
export function Confetti({
  variant = 'party',
  count = 48,
  intensity = 'normal',
}: Props) {
  const epic = intensity === 'epic'
  const total = epic ? Math.round(count * 1.75) : count

  const pieces = useMemo(() => {
    const colors =
      variant === 'moon'
        ? ['#fde68a', '#c4b5fd', '#e9d5ff', '#fbbf24', '#a78bfa', '#fff', '#7c3aed']
        : variant === 'win'
          ? ['#fde68a', '#fb7185', '#4ade80', '#38bdf8', '#fff', '#f59e0b', '#ff2d55']
          : ['#fb7185', '#fde68a', '#a78bfa', '#4ade80', '#38bdf8', '#fff']

    return Array.from({ length: total }, (_, i) => {
      const layer = i % 3
      const left = Math.random() * 100
      const delay = Math.random() * (epic ? 0.9 : 0.55)
      const duration = (epic ? 2.2 : 1.6) + Math.random() * (epic ? 1.8 : 1.2)
      const size = (epic ? 10 : 6) + Math.random() * (epic ? 14 : 8)
      const rot = Math.random() * 360
      const drift = (Math.random() - 0.5) * (epic ? 140 : 80)
      const rise = layer === 1 ? -20 - Math.random() * 30 : 0
      const color = colors[i % colors.length]
      const shape = i % 6 === 0 ? 'circle' : i % 3 === 0 ? 'rect' : 'strip'
      const burst = layer === 2
      return {
        left,
        delay,
        duration,
        size,
        rot,
        drift,
        rise,
        color,
        shape,
        burst,
        i,
      }
    })
  }, [total, epic, variant])

  return (
    <div
      className={[
        'confetti',
        `confetti--${variant}`,
        epic ? 'confetti--epic' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      {pieces.map((p) => (
        <span
          key={p.i}
          className={[
            'confetti__piece',
            `confetti__piece--${p.shape}`,
            p.burst ? 'confetti__piece--burst' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            left: `${p.left}%`,
            width: p.shape === 'strip' ? Math.max(5, p.size * 0.35) : p.size,
            height: p.shape === 'strip' ? p.size * 1.8 : p.size,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--drift' as string]: `${p.drift}px`,
            ['--rise' as string]: `${p.rise}px`,
            ['--rot' as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  )
}