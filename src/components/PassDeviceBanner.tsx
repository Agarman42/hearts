import './PassDeviceBanner.css'

interface Props {
  playerName: string
  onReady: () => void
}

export function PassDeviceBanner({ playerName, onReady }: Props) {
  return (
    <div className="pass-device" role="dialog" aria-label="Pass the device">
      <div className="pass-device__card">
        <p className="pass-device__eyebrow">Pass and play</p>
        <h2 className="pass-device__title">Pass to {playerName}</h2>
        <p className="pass-device__sub">Hand the device over. Tap when you are seated and ready.</p>
        <button type="button" className="btn btn--primary btn--lg pass-device__btn" onClick={onReady}>
          I&apos;m ready
        </button>
      </div>
    </div>
  )
}