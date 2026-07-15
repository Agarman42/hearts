import { describe, expect, it } from 'vitest'
import {
  applyCareerImport,
  buildCareerExport,
  canShareCareerSummary,
  careerExportJson,
  careerExportSummary,
  careerImportMergeWarnings,
  careerImportPreview,
  mergeCareerStats,
  mergeGoalsState,
  parseCareerImport,
} from './careerExport'
import {
  loadGoals,
  loadLifetimeGoalsCompleted,
  saveGoals,
  saveLifetimeGoalsCompleted,
  type GoalsState,
} from './goals'
import { EMPTY_STATS, loadStats } from './stats'

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

  it('merges career stats by taking higher totals', () => {
    const merged = mergeCareerStats(
      { ...EMPTY_STATS, recentMatches: [], matchesPlayed: 10, matchesWon: 4 },
      { ...EMPTY_STATS, recentMatches: [], matchesPlayed: 6, matchesWon: 7 },
    )
    expect(merged.matchesPlayed).toBe(10)
    expect(merged.matchesWon).toBe(7)
  })

  it('merge import keeps higher local totals', () => {
    const raw = careerExportJson()
    const parsed = parseCareerImport(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    parsed.data.games.hearts.stats.matchesPlayed = 3
    applyCareerImport(parsed.data, 'merge')
    expect(loadStats('hearts').matchesPlayed).toBeGreaterThanOrEqual(3)
  })

  it('includes goals state in export', () => {
    const data = buildCareerExport()
    expect(data.games.hearts.goalsState).toBeDefined()
    expect(data.games.hearts.goalsState?.active.length).toBeGreaterThan(0)
  })

  it('warns when merge import goals periods differ', () => {
    const data = buildCareerExport()
    const incoming = data.games.hearts.goalsState!
    incoming.periodKeys = { daily: '1999-01-01', weekly: 'w1999-0-1', monthly: '1999-01' }
    const warnings = careerImportMergeWarnings(data)
    expect(warnings.some((w) => w.includes('Hearts'))).toBe(true)
  })

  it('builds import preview lines', () => {
    const lines = careerImportPreview(buildCareerExport())
    expect(lines.length).toBeGreaterThanOrEqual(4)
    expect(lines[0]).toMatch(/Snapshot from v/)
    expect(lines[1]).toMatch(/Trophies/)
    expect(lines.some((l) => l.includes('♥ Hearts'))).toBe(true)
  })

  it('includes lifetime goals in export and summary', () => {
    saveLifetimeGoalsCompleted(12)
    const data = buildCareerExport()
    expect(data.lifetimeGoalsCompleted).toBe(12)
    expect(careerExportSummary()).toContain('Lifetime goals: 12')
  })

  it('imports lifetime goals on replace and merge max', () => {
    saveLifetimeGoalsCompleted(5)
    const raw = careerExportJson()
    const parsed = parseCareerImport(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    parsed.data.lifetimeGoalsCompleted = 20
    applyCareerImport(parsed.data, 'replace')
    expect(loadLifetimeGoalsCompleted()).toBe(20)

    saveLifetimeGoalsCompleted(15)
    applyCareerImport(parsed.data, 'merge')
    expect(loadLifetimeGoalsCompleted()).toBe(20)
  })

  it('imports goals on replace', () => {
    const goals = loadGoals('hearts')
    const goalId = goals.active[0]?.id
    expect(goalId).toBeTruthy()
    if (!goalId) return
    const patched: GoalsState = {
      ...goals,
      progress: {
        ...goals.progress,
        [goalId]: { id: goalId, current: 99, completed: true, claimedAt: 1 },
      },
    }
    const raw = careerExportJson()
    const parsed = parseCareerImport(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    parsed.data.games.hearts.goalsState = patched
    applyCareerImport(parsed.data, 'replace')
    expect(loadGoals('hearts').progress[goalId]?.current).toBe(99)
  })

  it('mergeGoalsState takes higher progress when periods match', () => {
    const local = loadGoals('spades')
    const incoming: GoalsState = {
      ...local,
      progress: {
        ...local.progress,
        [local.active[0].id]: {
          id: local.active[0].id,
          current: local.active[0].target,
          completed: true,
          claimedAt: 100,
        },
      },
    }
    const firstId = local.active[0].id
    const merged = mergeGoalsState(
      {
        ...local,
        progress: {
          ...local.progress,
          [firstId]: { id: firstId, current: 1, completed: false, claimedAt: null },
        },
      },
      incoming,
    )
    expect(merged.progress[firstId]?.current).toBe(incoming.active[0].target)
    expect(merged.progress[firstId]?.completed).toBe(true)
  })

  it('merge import skips goals when period keys differ', () => {
    const local = loadGoals('euchre')
    saveGoals(local, 'euchre')
    const raw = careerExportJson()
    const parsed = parseCareerImport(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const incoming = parsed.data.games.euchre.goalsState!
    incoming.periodKeys = { daily: '1999-01-01', weekly: 'w1999-0-1', monthly: '1999-01' }
    const goalId = incoming.active[0]?.id
    if (goalId) {
      incoming.progress[goalId] = {
        id: goalId,
        current: 99,
        completed: true,
        claimedAt: 1,
      }
    }
    applyCareerImport(parsed.data, 'merge')
    expect(loadGoals('euchre').progress[goalId!]?.current ?? 0).not.toBe(99)
  })
})