import { Avatar } from './Avatar'
import './PassDeviceBanner.css'

export type PassDeviceMode = 'turn' | 'pass' | 'receive' | 'bid' | 'discard' | 'loner'

interface Props {
  playerName: string
  onReady: () => void
  mode?: PassDeviceMode
  characterId?: string
}

const COPY: Record<
  PassDeviceMode,
  { title: (name: string) => string; sub: string }
> = {
  turn: {
    title: (name) => `Pass to ${name}`,
    sub: 'Hand the device over. Hide the screen until they are seated — then tap ready.',
  },
  pass: {
    title: (name) => `${name} — your pass`,
    sub: 'Only you should see this hand. Select cards, then confirm.',
  },
  receive: {
    title: (name) => `${name} — review cards`,
    sub: 'Check what you received, then accept to join the hand.',
  },
  bid: {
    title: (name) => `${name} — your bid`,
    sub: 'Keep the screen private while you review and bid.',
  },
  discard: {
    title: (name) => `${name} — discard`,
    sub: 'Trump is set — tap when ready to choose a discard.',
  },
  loner: {
    title: (name) => `${name} — go alone?`,
    sub: 'Choose alone or with partner when you have the device.',
  },
}

export function PassDeviceBanner({
  playerName,
  onReady,
  mode = 'turn',
  characterId,
}: Props) {
  const copy = COPY[mode]
  return (
    <div
      className="pass-device"
      role="dialog"
      aria-modal="true"
      aria-label="Pass the device — privacy screen"
    >
      <div className="pass-device__scrim" aria-hidden />
      <div className="pass-device__card">
        <p className="pass-device__eyebrow">Pass and play · private</p>
        {characterId && (
          <div className="pass-device__avatar">
            <Avatar characterId={characterId} size="lg" />
          </div>
        )}
        <h2 className="pass-device__title">{copy.title(playerName)}</h2>
        <p className="pass-device__sub">{copy.sub}</p>
        <p className="pass-device__privacy">
          Table and scores stay hidden until you confirm.
        </p>
        <button
          type="button"
          className="btn btn--primary btn--lg pass-device__btn"
          onClick={onReady}
          autoFocus
        >
          I&apos;m ready — show my hand
        </button>
      </div>
    </div>
  )
}
