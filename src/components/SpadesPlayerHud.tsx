import { isHeartsExtras, type SeatView } from '../games/tablePlayer'
import './SpadesPlayerHud.css'

function bidLabel(
  bid: number | null,
  nil: boolean,
  blindNil: boolean,
): string {
  if (bid == null) return '–'
  if (blindNil) return 'B∅'
  if (nil) return '∅'
  return String(bid)
}

interface Props {
  player: SeatView
  partner: SeatView
  active?: boolean
}

export function SpadesPlayerHud({ player, partner, active = false }: Props) {
  const extras = player.extras && !isHeartsExtras(player.extras) ? player.extras : null
  const partnerExtras =
    partner.extras && !isHeartsExtras(partner.extras) ? partner.extras : null
  if (!extras) return null

  const yourBid = bidLabel(extras.bid, extras.nil, extras.blindNil)
  const partnerBid = partnerExtras
    ? bidLabel(partnerExtras.bid, partnerExtras.nil, partnerExtras.blindNil)
    : '–'

  return (
    <div
      className={['spades-hud', active ? 'spades-hud--active' : ''].filter(Boolean).join(' ')}
      aria-label={`Your bid ${yourBid}, ${extras.tricksWon} tricks won`}
    >
      <div className="spades-hud__identity">
        <span className="spades-hud__name">{player.name}</span>
        {partnerExtras && (
          <span className="spades-hud__partner">
            {partner.name} · bid {partnerBid} · {partnerExtras.tricksWon} tricks
          </span>
        )}
      </div>

      <div className="spades-hud__stats">
        <div className="spades-hud__score" title="Team score">
          <span className="spades-hud__score-label">Score</span>
          <span className="spades-hud__score-value">{player.totalScore}</span>
        </div>
        <div
          className={[
            'spades-hud__chip',
            'spades-hud__chip--bid',
            extras.bid != null ? 'is-hot' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          title="Your bid this hand"
        >
          <span className="spades-hud__chip-label">Bid</span>
          <span className="spades-hud__chip-value">{yourBid}</span>
        </div>
        <div
          className={[
            'spades-hud__chip',
            'spades-hud__chip--tricks',
            extras.tricksWon > 0 ? 'is-hot' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          title="Tricks you've taken"
        >
          <span className="spades-hud__chip-label">Tricks</span>
          <span className="spades-hud__chip-value">{extras.tricksWon}</span>
        </div>
      </div>
    </div>
  )
}