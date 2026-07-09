import type { CSSProperties } from 'react'
import { getCharacter } from '../characters'
import './Avatar.css'

interface Props {
  characterId: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  active?: boolean
  className?: string
}

export function Avatar({ characterId, size = 'md', active, className }: Props) {
  const c = getCharacter(characterId)
  return (
    <div
      className={[
        'avatar',
        `avatar--${size}`,
        active ? 'avatar--active' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          background: c.gradient,
          '--avatar-glow': c.glow,
        } as CSSProperties
      }
      title={c.label}
      aria-label={c.label}
    >
      <span className="avatar__ring" aria-hidden />
      <img
        className="avatar__img"
        src={c.portrait}
        alt=""
        draggable={false}
        onError={(e) => {
          // Fallback to emoji if portrait fails to load
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          const sib = e.currentTarget.nextElementSibling as HTMLElement | null
          if (sib) sib.style.display = 'grid'
        }}
      />
      <span className="avatar__emoji" style={{ display: 'none' }}>
        {c.emoji}
      </span>
    </div>
  )
}
