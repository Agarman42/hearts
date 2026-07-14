import { describe, expect, it } from 'vitest'
import { createInitialState } from './engine'
import { scoreHand } from './scoring'

describe('scoreHand', () => {
  const rules = createInitialState().rules

  it('awards march for 5 tricks', () => {
    const r = scoreHand('ns', 5, rules)
    expect(r.points.ns).toBe(2)
    expect(r.marched).toBe(true)
    expect(r.loner).toBe(false)
  })

  it('awards loner march 4 points', () => {
    const r = scoreHand('ns', 5, rules, true)
    expect(r.points.ns).toBe(4)
    expect(r.marched).toBe(true)
    expect(r.loner).toBe(true)
  })

  it('awards 1 point for 3 tricks loner', () => {
    const r = scoreHand('ns', 3, rules, true)
    expect(r.points.ns).toBe(1)
    expect(r.loner).toBe(true)
  })

  it('euchres defenders when makers get 2', () => {
    const r = scoreHand('ns', 2, rules)
    expect(r.points.ew).toBe(2)
    expect(r.euchred).toBe(true)
  })
})