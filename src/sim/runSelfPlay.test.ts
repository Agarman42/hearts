import { describe, expect, it } from 'vitest'
import { formatSelfPlayReport, runSelfPlay } from './runSelfPlay'

/**
 * Smoke tests — tiny match counts so `npm test` stays fast.
 * Full sims: `npm run sim` (SELFPLAY=1).
 */
describe('self-play harness smoke', () => {
  it('runs a short euchre hard vs hard match batch', () => {
    const report = runSelfPlay({ game: 'euchre', matches: 2, ns: 'hard', ew: 'hard' })
    expect(report.game).toBe('euchre')
    if (report.game === 'euchre') {
      expect(report.nsWins + report.ewWins + report.draws + report.aborted).toBe(2)
    }
    expect(formatSelfPlayReport(report).length).toBeGreaterThan(20)
  }, 60_000)

  it('runs a short spades hard vs medium match batch', () => {
    const report = runSelfPlay({ game: 'spades', matches: 2, ns: 'hard', ew: 'medium' })
    expect(report.game).toBe('spades')
    if (report.game === 'spades') {
      expect(report.matches).toBe(2)
    }
  }, 60_000)

  it('runs a short hearts all-hard batch', () => {
    const report = runSelfPlay({ game: 'hearts', matches: 2, difficulty: 'hard' })
    expect(report.game).toBe('hearts')
    if (report.game === 'hearts') {
      const total =
        report.seatWins[0] +
        report.seatWins[1] +
        report.seatWins[2] +
        report.seatWins[3] +
        report.aborted
      expect(total).toBe(2)
    }
  }, 60_000)
})
