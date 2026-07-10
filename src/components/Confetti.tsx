import { useMemo } from 'react'
import './Confetti.css'

interface Props {
  /** 'moon' | 'win' | 'party' */
  variant?: 'moon' | 'win' | 'party'
  /** Auto-hide after ms (parent usually unmounts) */
  count?: number
}

/**
 * Lightweight CSS confetti burst — no canvas, fine for mobile.
 */
export function Confetti({ variant = 'party', count = 48 }: Props) {
  const pieces = useMemo(() => {
    const colors =
      variant === 'moon'
        ? ['#fde68a', '#c4b5fd', '#e9d5ff', '#fbbf24', '#a78bfa', '#fff']
        : variant === 'win'
          ? ['#fde68a', '#fb7185', '#4ade80', '#38bdf8', '#fff', '#f59e0b']
          : ['#fb7185', '#fde68a', '#a78bfa', '#4ade80', '#38bdf8', '#fff']

    return Array.from({ length: count }, (_, i) => {
      const left = Math.random() * 100
      const delay = Math.random() * 0.45
      const duration = 1.6 + Math.random() * 1.4
      const size = 6 + Math.random() * 8
      const rot = Math.random() * 360
      const drift = (Math.random() - 0.5) * 80
      const color = colors[i % colors.length]
      const shape = i % 5 === 0 ? 'circle' : i % 3 === 0 ? 'rect' : 'strip'
      return { left, delay, duration, size, rot, drift, color, shape, i }
    })
  }, [count, variant])

  return (
    <div className={`confetti confetti--${variant}`} aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.i}
          className={`confetti__piece confetti__piece--${p.shape}`}
          style={{
            left: `${p.left}%`,
            width: p.shape === 'strip' ? 4 : p.size,
            height: p.shape === 'strip' ? p.size * 1.6 : p.size,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--drift' as string]: `${p.drift}px`,
            ['--rot' as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  )
}
