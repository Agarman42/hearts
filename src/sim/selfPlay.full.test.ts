/**
 * Dev-only self-play runner. Skipped in normal `npm test`.
 *
 *   npm run sim
 *   npm run sim:euchre
 *   MATCHES=200 NS=hard EW=medium npm run sim:spades
 */
import { describe, expect, it } from 'vitest'
import { formatSelfPlayReport, runSelfPlay, type SimGame } from './runSelfPlay'
import type { AiDifficulty } from '../core/types'

const enabled = process.env.SELFPLAY === '1'

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name])
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function envDiff(name: string, fallback: AiDifficulty): AiDifficulty {
  const v = process.env[name]
  if (v === 'easy' || v === 'medium' || v === 'hard') return v
  return fallback
}

function envGame(): SimGame | 'all' {
  const g = process.env.GAME
  if (g === 'euchre' || g === 'spades' || g === 'hearts' || g === 'all') return g
  return 'all'
}

describe.skipIf(!enabled)('self-play harness (dev only)', () => {
  const matches = envInt('MATCHES', 50)
  const game = envGame()
  const ns = envDiff('NS', 'hard')
  const ew = envDiff('EW', 'hard')
  const difficulty = envDiff('DIFFICULTY', 'hard')

  const games: SimGame[] =
    game === 'all' ? ['euchre', 'spades', 'hearts'] : [game]

  for (const g of games) {
    it(
      `${g}: ${matches} matches`,
      () => {
        const report = runSelfPlay({
          game: g,
          matches,
          ns,
          ew,
          difficulty,
        })
        console.log(`\n${formatSelfPlayReport(report)}\n`)
        expect(report.matches).toBe(matches)
        expect(report.aborted).toBeLessThan(matches) // at least some must finish
      },
      300_000,
    )
  }
})
