import { describe, expect, it } from 'vitest'
import {
  applyCareerImport,
  buildCareerExport,
  canShareCareerSummary,
  careerExportJson,
  careerExportSummary,
  parseCareerImport,
} from './careerExport'
import { loadStats } from './stats'

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

  it('reports share availability without throwing', () => {
    expect(typeof canShareCareerSummary()).toBe('boolean')
  })

  it('includes achievement unlock maps in export', () => {
    const data = buildCareerExport()
    expect(data.games.hearts.achievementUnlocks).toBeDefined()
    expect(data.trophyUnlocks).toBeDefined()
  })

  it('parses and applies a career snapshot', () => {
    const raw = careerExportJson()
    const parsed = parseCareerImport(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    parsed.data.games.hearts.stats.matchesPlayed = 42
    applyCareerImport(parsed.data)
    expect(loadStats('hearts').matchesPlayed).toBe(42)
  })

  it('rejects invalid import JSON', () => {
    expect(parseCareerImport('not json').ok).toBe(false)
    expect(parseCareerImport('{}').ok).toBe(false)
  })
})