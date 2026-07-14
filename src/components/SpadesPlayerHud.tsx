import { isSpadesExtras, type SeatView } from '../games/tablePlayer'
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
  teamBags?: number
  bagsPerPenalty?: number
  active?: boolean
  isDealer?: boolean
  biddingPhase?: boolean
  yourBidTurn?: boolean
}

export function SpadesPlayerHud({
  player,
  partner,
  teamBags = 0,
  bagsPerPenalty = 10,
  active = false,
  isDealer = false,
  biddingPhase = false,
  yourBidTurn = false,
}: Props) {
  const extras = player.extras && isSpadesExtras(player.extras) ? player.extras : null
  const partnerExtras =
    partner.extras && isSpadesExtras(partner.extras) ? partner.extras : null
  if (!extras) return null

  const yourBid = biddingPhase
    ? extras.bid != null
      ? bidLabel(extras.bid, extras.nil, extras.blindNil)
      : yourBidTurn
        ? 'Bid now'
        : 'Waiting'
    : bidLabel(extras.bid, extras.nil, extras.blindNil)
  const partnerBid = partnerExtras
    ? bidLabel(partnerExtras.bid, partnerExtras.nil, partnerExtras.blindNil)
    : '–'
  const bagsHot = teamBags >= Math.max(1, bagsPerPenalty - 2)
  const bagsCritical = teamBags >= Math.max(1, bagsPerPenalty - 1)

  return (
    <div
      className={['spades-hud', active ? 'spades-hud--active' : ''].filter(Boolean).join(' ')}
      aria-label={`Your bid ${yourBid}, ${extras.tricksWon} tricks won, ${teamBags} bags`}
    >
      <div className="spades-hud__identity">
        <span className="spades-hud__name">
          {player.name}
          {isDealer && <span className="spades-hud__dealer">Dealer</span>}
        </span>
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
            'spades-hud__chip--bags',
            bagsHot ? 'is-hot' : '',
            bagsCritical ? 'is-critical' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          title={`Team bags — ${bagsPerPenalty} triggers −100 penalty`}
        >
          <span className="spades-hud__chip-label">Bags</span>
          <span className="spades-hud__chip-value">
            {teamBags}
            <span className="spades-hud__chip-suffix">/{bagsPerPenalty}</span>
          </span>
        </div>
        <div
          className={[
            'spades-hud__chip',
            'spades-hud__chip--bid',
            extras.bid != null ? 'is-hot is-locked' : '',
            biddingPhase && extras.bid == null && yourBidTurn ? 'is-bidding' : '',
            biddingPhase && extras.bid == null && !yourBidTurn ? 'is-waiting' : '',
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