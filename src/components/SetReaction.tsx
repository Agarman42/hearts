import { useMemo } from 'react'
import './Table.css'

/** Gray “rain” + glum glyph for being set / euchred — no confetti. */
export function SetReaction() {
  const drops = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 8) * 0.12}s`,
        duration: `${1.4 + (i % 5) * 0.22}s`,
        opacity: 0.35 + (i % 4) * 0.12,
      })),
    [],
  )

  return (
    <div className="set-reaction" role="presentation" aria-hidden>
      <div className="set-reaction__rain">
        {drops.map((d, i) => (
          <span
            key={i}
            className="set-reaction__drop"
            style={{
              left: d.left,
              animationDelay: d.delay,
              animationDuration: d.duration,
              opacity: d.opacity,
            }}
          />
        ))}
      </div>
      <span className="set-reaction__glyph">☹</span>
    </div>
  )
}
