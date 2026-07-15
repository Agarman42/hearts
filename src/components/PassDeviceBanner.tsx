import './PassDeviceBanner.css'

export type PassDeviceMode = 'turn' | 'pass' | 'receive' | 'bid' | 'discard' | 'loner'

interface Props {
  playerName: string
  onReady: () => void
  mode?: PassDeviceMode
}

const COPY: Record<
  PassDeviceMode,
  { title: (name: string) => string; sub: string }
> = {
  turn: {
    title: (name) => `Pass to ${name}`,
    sub: 'Hand the device over. Tap when you are seated and ready to play.',
  },
  pass: {
    title: (name) => `${name} — your pass`,
    sub: 'Select cards to pass, then confirm when ready.',
  },
  receive: {
    title: (name) => `${name} — review cards`,
    sub: 'Check what you received, then accept to join the hand.',
  },
  bid: {
    title: (name) => `${name} — your bid`,
    sub: 'Review your hand and lock in a bid when ready.',
  },
  discard: {
    title: (name) => `${name} — discard`,
    sub: 'Trump is set — tap when ready to drop a card.',
  },
  loner: {
    title: (name) => `${name} — go alone?`,
    sub: 'Choose alone or with partner, then tap when ready.',
  },
}

export function PassDeviceBanner({ playerName, onReady, mode = 'turn' }: Props) {
  const copy = COPY[mode]
  return (
    <div className="pass-device" role="dialog" aria-label="Pass the device">
      <div className="pass-device__card">
        <p className="pass-device__eyebrow">Pass and play</p>
        <h2 className="pass-device__title">{copy.title(playerName)}</h2>
        <p className="pass-device__sub">{copy.sub}</p>
        <button type="button" className="btn btn--primary btn--lg pass-device__btn" onClick={onReady}>
          I&apos;m ready
        </button>
      </div>
    </div>
  )
}