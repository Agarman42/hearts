import { describe, expect, it } from 'vitest'
import { buildCareerExport, careerExportJson, careerExportSummary } from './careerExport'

describe('careerExport', () => {
  it('includes all three games', () => {
    const data = buildCareerExport()
    expect(data.games.hearts).toBeDefined()
    expect(data.games.spades).toBeDefined()
    expect(data.games.euchre).toBeDefined()
    expect(data.appVersion).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('builds a readable text summary', () => {
    const text = careerExportSummary()
    expect(text).toContain('Cutthroat career')
    expect(text).toContain('♥ Hearts')
    expect(text).toContain('♠ Spades')
    expect(text).toContain('♦ Euchre')
  })

  it('serializes to valid JSON', () => {
    const raw = careerExportJson()
    const parsed = JSON.parse(raw) as ReturnType<typeof buildCareerExport>
    expect(parsed.exportedAt).toBeTruthy()
    expect(parsed.games.hearts.stats.matchesPlayed).toBeGreaterThanOrEqual(0)
  })
})