/**
 * Humor mode: optional chaos narrator for the table.
 * Unhinged, absurd, sports-announcer energy — still no slurs / real cruelty.
 */

const YOUR_TURN = [
  'Your move, menace.',
  'The cards are scared of you. Prove it.',
  "Don't think. Vibe. Dump.",
  'Somewhere a heart is sweating. Play.',
  'Be the villain. Be free.',
  'The Queen is watching. Blink twice if you have her.',
  'Main character timing. Use it.',
  'Play something mean or play something meaner.',
  'Your ancestors passed left. Honor them. Or don\'t.',
  'Hot potato protocol: engage.',
  'I believe in you. The AI does not.',
  'That Ace is looking at you funny. Respond.',
  'Silence of the lambs, but with clubs.',
  'Risk it for the biscuit. The biscuit is 0 points.',
  'You could play safe. You could also cause problems.',
  'The felt is a stage. Enter.',
  'Chaos is a ladder. So is the 2 of clubs.',
  'Psychic damage incoming. From you, preferably.',
  'Tap a card like it owes you money.',
  'Do a crime (legal ones only, sorry).',
]

const AI_THINK = [
  (name: string) => `${name} is buffering… 99%… still buffering.`,
  (name: string) => `${name} opened Excel about this trick.`,
  (name: string) => `${name} is praying to the algorithm.`,
  (name: string) => `${name} just googled "how hearts work" mid-hand.`,
  (name: string) => `${name} entered a fugue state over a 4 of diamonds.`,
  (name: string) => `${name} is drafting a 40-page manifesto against you.`,
  (name: string) => `${name} whispered "not the Queen" to no one.`,
  (name: string) => `${name} is calculating 14-dimensional regret.`,
  (name: string) => `${name} just saw god. God was the ♥A.`,
  (name: string) => `${name} is doing rock-paper-scissors with themselves.`,
  (name: string) => `${name} has left the chat. Mentally.`,
  (name: string) => `${name} is speedrunning an identity crisis.`,
  (name: string) => `${name} rolled a nat 1 on game theory.`,
  (name: string) => `${name} is consulting a haunted Magic 8-Ball.`,
  (name: string) => `${name} typed "umm" out loud.`,
]

const TRICK_WIN = [
  (name: string, pts: number) => {
    if (pts >= 13) {
      return pick([
        `${name} swallowed the Queen whole. Unwell behavior.`,
        `${name} just adopted a 13-point cat. It's the Queen.`,
        `${name}: "+13 and a trauma bond."`,
        `${name} collected the royal pain package.`,
        `♠Q has a new landlord: ${name}. Condolences.`,
      ])
    }
    if (pts > 5) {
      return pick([
        `${name} scoops ${pts} like a villain monologue.`,
        `${name} takes +${pts}. The table felt that.`,
        `${name} said "mine" to a pile of consequences.`,
        `${name} is building a points museum (+${pts}).`,
        `+${pts} for ${name}. Spicy little crime scene.`,
      ])
    }
    if (pts > 0) {
      return pick([
        `${name} nicks ${pts}. Petty. Iconic.`,
        `${name} steals a snack-sized +${pts}.`,
        `${name} takes ${pts} like loose change. Dangerous.`,
        `+${pts} to ${name}. Death by a thousand pips.`,
      ])
    }
    return pick([
      `${name} takes nothing. Clean hands. Suspicious.`,
      `${name} scoops a zero. Pure of heart (for now).`,
      `${name} wins the empty plate award.`,
      `${name} claims the trick and zero drama. Boring legend.`,
      `${name} dodged the tax. For now.`,
    ])
  },
]

const HEARTS_BROKEN = [
  '♥ BROKEN. The soft era is over.',
  'Hearts are live. Hide your children and your Aces.',
  'Someone opened the blood-red floodgates.',
  '♥ is online. Wi-Fi password is "pain".',
  'The hearts got out. There is no putting them back.',
  'We\'re so back. Unfortunately.',
  'Hearts broken. Gloves off. Therapy booked.',
  'The table just went from brunch to cage match.',
  '♥ unlocked. May the odds be never in your favor.',
  'Someone said "yolo" with a heart. History will judge them.',
]

const QUEEN = [
  'Thirteen points of pure theater.',
  'The Queen has chosen violence. And a seat.',
  '♠Q has entered the chat. Nobody is okay.',
  'Royal dump complete. Send flowers.',
  'That\'s not a card. That\'s a personal attack.',
  'The Black Lady found a victim. Classic romance.',
  '13 pts. No refunds. No mercy. No notes.',
  'She\'s here. She\'s purple. She\'s everyone\'s problem.',
  'The table just got lore.',
  'Someone is going to talk about this in group chat.',
  'Queen tax applied. Economy in shambles.',
  'A legend was born. A score was ruined.',
]

const MOON = [
  (name: string) =>
    `🌙 ${name} shot the moon! Absolute cinema. Standing ovation. Therapy later.`,
  (name: string) =>
    `🌙 ${name} yeeted 26 points like a Greek god with a grudge.`,
  (name: string) =>
    `🌙 Moon acquired by ${name}. Everyone else: skill issue.`,
  (name: string) =>
    `🌙 ${name} said "all 26 or nothing" and chose violence successfully.`,
  (name: string) =>
    `🌙 ${name} just speedran villainy. 26 points of main-character energy.`,
  (name: string) =>
    `🌙 Full moon. ${name} howled. Your scorecard cried.`,
  (name: string) =>
    `🌙 ${name} pulled a heist. The loot: everyone else's dignity.`,
]

const PASS = [
  'Three gifts. Make them cursed.',
  'Pass like you\'re returning a haunted microwave.',
  'Be generous. Be evil. Be both.',
  'Those three cards? Emotional support weapons.',
  'Think of it as gifting someone a small crisis.',
  'Select with spite. Confirm with confidence.',
  'The pass is a love language. A toxic one.',
  'Give them the Queen and a smile. Or don\'t. Coward.',
  'Three-card monte but the prize is psychological damage.',
  'Pack a care package of problems.',
  'If you wouldn\'t want it, perfect — pass it.',
  'Strategic charity. Morally gray. I\'m proud.',
]

const RECEIVE = [
  (name: string) => `Care package from ${name}. Open carefully.`,
  (name: string) => `${name} sent mail. It might bite.`,
  (name: string) => `Three little secrets from ${name}. Trust no one.`,
  (name: string) => `${name} gift-wrapped a situation.`,
  (name: string) => `Inbox from ${name}: "thinking of you (meanly)."`,
  (name: string) => `${name} said "these are fine." They are not fine.`,
]

const ILLEGAL = [
  'Absolutely not. The cards filed a restraining order.',
  'Illegal. Bold. Wrong. Try again, chaos gremlin.',
  'The rules slapped your hand. Softly. For now.',
  'That play was a vibe. A banned vibe.',
  'Nice try — the universe said "nope."',
  'You can\'t do that. Spiritually or legally.',
  'Foul. Yellow card. Sit down (metaphorically).',
  'The table rejects your reality and substitutes its own.',
  'That card looked at you and said "choose life."',
  'Invalid. But the confidence? Chef\'s kiss.',
  'Error 403: Forbidden by the gods of Hearts.',
  'The 2♣ is laughing at you from the afterlife.',
]

const RACING = [
  'All points are out. This is just card yoga now.',
  '26 pts already claimed. We\'re playing for vibes.',
  'Auto-finish energy. Speedrun the leftovers.',
  'The plot is over. Credits still rolling.',
  'Nothing left to fear but fear itself (and bad leads).',
  'Points? Done. Dignity? Still contested.',
]

const HAND_DONE = [
  'Hand over. Cope. Hydrate. Next.',
  'That hand had lore. The scoreboard has receipts.',
  'Intermission. Please scream into a pillow.',
  'Scores updated. Feelings: mixed at best.',
  'The hand is dead. Long live the next trauma.',
  'Math happened. Emotions also happened.',
]

const YOU_WIN = [
  'You win! Lowest score, highest swagger. Frame this.',
  'Victory. The AI will write fanfiction about this loss.',
  'Champion of the velvet table. Kiss the felt.',
  'You out-pettied three robots. Historic.',
  'Match over. You are the main character. Confirmed.',
  'They played cards. You played 4D chess with hearts.',
  'Win secured. Update your résumé: "Professional Menace."',
  'The Queen fears you. As she should.',
]

const YOU_LOSE = [
  (name: string) => `${name} takes the match. Touch grass. Then rematch.`,
  (name: string) => `GG. ${name} cooked. You were the side dish.`,
  (name: string) => `${name} wins. The algorithm chose violence.`,
  (name: string) => `Defeat by ${name}. Character development unlocked.`,
  (name: string) => `${name} stole the crown. Plot twist: you let them.`,
  (name: string) => `Match to ${name}. Your villain origin story begins now.`,
  (name: string) => `${name} wins. Respectfully, that was rude.`,
]

const DEAL = [
  'Fresh hand. Fresh sins.',
  'New cards, same chaos engine.',
  'The deck has spoken. It sounds unhinged.',
  'Shuffle complete. Destiny is a 52-card deck.',
  'Deal me in said the fool. That was you. Affectionately.',
]

function pick<T>(arr: T[], rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]!
}

export function humorYourTurn(): string {
  return pick(YOUR_TURN)
}

export function humorAiThinking(name: string): string {
  return pick(AI_THINK)(name)
}

export function humorTrickWin(name: string, pts: number): string {
  return pick(TRICK_WIN)(name, pts)
}

export function humorHeartsBroken(): string {
  return pick(HEARTS_BROKEN)
}

export function humorQueen(): string {
  return pick(QUEEN)
}

export function humorMoon(name: string): string {
  return pick(MOON)(name)
}

export function humorPass(): string {
  return pick(PASS)
}

export function humorReceive(fromName: string): string {
  return pick(RECEIVE)(fromName)
}

export function humorIllegal(): string {
  return pick(ILLEGAL)
}

export function humorRacing(): string {
  return pick(RACING)
}

export function humorHandDone(): string {
  return pick(HAND_DONE)
}

export function humorDeal(): string {
  return pick(DEAL)
}

export function humorMatchEnd(winnerName: string, youWon: boolean): string {
  return youWon ? pick(YOU_WIN) : pick(YOU_LOSE)(winnerName)
}

// —— Spades ——

const SPADES_YOUR_TURN = [
  'Your lead. Make it spicy.',
  'Play something that ages poorly for opponents.',
  'The trick is yours. Do crimes (legal ones).',
  'Spades are watching. So is your partner.',
  'Trust the hand. Or distrust everyone equally.',
  'This card choice will be discussed in therapy.',
]

const SPADES_AI = [
  (name: string) => `${name} is doing mental trigonometry on this trick.`,
  (name: string) => `${name} stared at the felt until it blinked.`,
  (name: string) => `${name} is consulting a haunted bidding spreadsheet.`,
  (name: string) => `${name} whispered "not spades" to the void.`,
  (name: string) => `${name} entered spreadsheet mode. Run.`,
]

const SPADES_BROKEN = [
  '♠ BROKEN. The table just got honest.',
  'Spades are live. Hide your trump.',
  'Someone broke spades. It was probably on purpose.',
  '♠ unlocked. Partnership counseling pending.',
  'The soft era ended. Spades era begins.',
]

const SPADES_TRICK = [
  (name: string) => `${name} takes the trick. Rude. Effective.`,
  (name: string) => `${name} collects. The plot thickens.`,
  (name: string) => `${name} wins it like rent is due.`,
  (name: string) => `Trick to ${name}. Narrator voice: "Uh-oh."`,
]

const SPADES_ILLEGAL = [
  'Nope. The spade police said no.',
  'Illegal play. The felt rejected your energy.',
  'That card is on timeout.',
  'Rules said "nice try" and closed the tab.',
  'Invalid. Your partner sighed audibly.',
]

const SPADES_HAND_DONE = [
  'Hand scored. Partner has notes.',
  'Math happened. Bags may have happened.',
  'Scores updated. Blame distribution in progress.',
  'Hand complete. Hydrate. Rebid.',
]

const SPADES_WIN = [
  'Your team wins! Champagne for you, spreadsheets for them.',
  'Match to North/South. The algorithm kneels.',
  'Victory. Your partner owes you a high-five.',
  'You raced to 500 and won. Historic menace behavior.',
]

const SPADES_LOSE = [
  'East/West takes it. Rematch fuel acquired.',
  'They got there first. Rude but legal.',
  'Match over. Your bags have bags.',
  'Defeat. The spades remember.',
]

const SPADES_BID = [
  'Your bid is locked. No take-backsies.',
  'Bid confirmed. Partner is already nervous.',
  'Locked in. May the tricks be ever in your favor.',
]

const SPADES_SET = [
  'Contract set! The scoreboard is disappointed.',
  'You missed the bid. Bags were not the problem this time.',
  'Set. Your partner has that look.',
  'Short of the bid. Rematch energy loading.',
]

const SPADES_BAG = [
  'Bag bomb! −100 and counting.',
  'Ten bags. The penalty fairy collects.',
  'Sandbagged into oblivion.',
  'Bags overflowed. Scoreboard weeps.',
]

export function humorSpadesYourTurn(): string {
  return pick(SPADES_YOUR_TURN)
}

export function humorSpadesAiThinking(name: string): string {
  return pick(SPADES_AI)(name)
}

export function humorSpadesBroken(): string {
  return pick(SPADES_BROKEN)
}

export function humorSpadesTrickWin(name: string): string {
  return pick(SPADES_TRICK)(name)
}

export function humorSpadesIllegal(): string {
  return pick(SPADES_ILLEGAL)
}

export function humorSpadesHandDone(): string {
  return pick(SPADES_HAND_DONE)
}

export function humorSpadesMatchEnd(youWon: boolean): string {
  return youWon ? pick(SPADES_WIN) : pick(SPADES_LOSE)
}

export function humorSpadesBidLocked(): string {
  return pick(SPADES_BID)
}

export function humorSpadesSet(): string {
  return pick(SPADES_SET)
}

export function humorSpadesBagPenalty(): string {
  return pick(SPADES_BAG)
}

const EUCHRE_YOUR_TURN = [
  'Your play — don’t flash the left bower.',
  'Table’s waiting. Lead something respectable.',
  'Your turn. Partner’s counting on you.',
  'Play a card before the barn cats judge you.',
]

const EUCHRE_AI = [
  (name: string) => `${name} is squinting at their hand…`,
  (name: string) => `${name} pretends this is hard.`,
  (name: string) => `${name} is doing Euchre math.`,
  (name: string) => `${name} hesitates dramatically.`,
]

const EUCHRE_TRUMP = [
  'Trump is set. Bowers are lurking.',
  'Suit picked. Left bower energy.',
  'Trump locked. Play accordingly.',
  'New trump. Jack is wearing two hats.',
]

const EUCHRE_TRICK = [
  (name: string) => `${name} snags the trick.`,
  (name: string) => `${name} wins — unlucky for everyone else.`,
  (name: string) => `${name} takes it. Table groans.`,
  (name: string) => `${name} books the trick.`,
]

const EUCHRE_MARCH = [
  'March! All five tricks — rude and beautiful.',
  'Clean sweep. Makers marched.',
  'Five for five. That’s a march.',
  'Every trick. Opponents stunned.',
]

const EUCHRE_EUCHRED = [
  'Euchre! Makers whiffed — defenders feast.',
  'Gotcha! Two points for the defense.',
  'Euchre’d. Should’ve ordered better.',
  'Makers set. Barn rules.',
]

const EUCHRE_ILLEGAL = [
  'Nope — follow suit if you can.',
  'That card’s not legal. Table says no.',
  'Illegal play. Left bower won’t save you.',
  'Can’t play that. Suit matters here.',
]

const EUCHRE_HAND_DONE = [
  'Hand done. Scoreboard updated.',
  'Another hand in the books.',
  'Tricks counted. Onward.',
  'Hand complete — shuffle incoming.',
]

const EUCHRE_WIN = [
  'Your team takes the match!',
  'Winners. Buy the next round.',
  'Match yours. Well played.',
  'Victory — partner owes you nothing.',
]

const EUCHRE_LOSE = [
  'Match over. Rematch?',
  'They got you this time.',
  'Close or not — they won.',
  'Better luck next barn session.',
]

const EUCHRE_STICK = [
  'Stick the dealer — someone’s naming trump.',
  'Dealer stuck. No more passing.',
  'Round two bust — dealer must call.',
  'Stick the dealer. Choose wisely.',
]

export function humorEuchreYourTurn(): string {
  return pick(EUCHRE_YOUR_TURN)
}

export function humorEuchreAiThinking(name: string): string {
  return pick(EUCHRE_AI)(name)
}

export function humorEuchreTrump(): string {
  return pick(EUCHRE_TRUMP)
}

export function humorEuchreTrickWin(name: string): string {
  return pick(EUCHRE_TRICK)(name)
}

export function humorEuchreMarch(): string {
  return pick(EUCHRE_MARCH)
}

export function humorEuchreEuchred(): string {
  return pick(EUCHRE_EUCHRED)
}

export function humorEuchreIllegal(): string {
  return pick(EUCHRE_ILLEGAL)
}

export function humorEuchreHandDone(): string {
  return pick(EUCHRE_HAND_DONE)
}

export function humorEuchreMatchEnd(youWon: boolean): string {
  return youWon ? pick(EUCHRE_WIN) : pick(EUCHRE_LOSE)
}

export function humorEuchreStick(): string {
  return pick(EUCHRE_STICK)
}

const EUCHRE_LONER = [
  'Going alone — partner grabs a coffee.',
  'Loner called. Three-on-one.',
  'Solo mission. March for four.',
  'Partner sits. Hero mode.',
]

export function humorEuchreLoner(): string {
  return pick(EUCHRE_LONER)
}
