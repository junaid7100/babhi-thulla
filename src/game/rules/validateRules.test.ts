import { describe, expect, it } from 'vitest'
import { createDefaultThullaRules, createTrumpSuitRules } from './defaultRules'
import { playersForRules, validateRules } from './validateRules'

describe('validateRules', () => {
  it('accepts the default classic ruleset', () => {
    expect(validateRules(createDefaultThullaRules())).toEqual([])
  })

  it('accepts the trump-suit variant', () => {
    expect(validateRules(createTrumpSuitRules())).toEqual([])
  })

  it('flags minPlayers below 2', () => {
    const rules = { ...createDefaultThullaRules(), minPlayers: 1 }
    expect(validateRules(rules).some((i) => i.field === 'minPlayers')).toBe(true)
  })

  it('flags maxPlayers below minPlayers', () => {
    const rules = { ...createDefaultThullaRules(), minPlayers: 5, maxPlayers: 3 }
    expect(validateRules(rules).some((i) => i.field === 'maxPlayers')).toBe(true)
  })

  it('flags a required opening lead with no card set', () => {
    const rules = { ...createDefaultThullaRules(), openingLead: { required: true } }
    expect(validateRules(rules).some((i) => i.field === 'openingLead.card')).toBe(true)
  })

  it('flags a fixed trump mode with no fixed suit', () => {
    const rules = createTrumpSuitRules()
    rules.tulla = { mode: 'TRUMP_SUIT', determination: 'FIXED', canChange: false }
    expect(validateRules(rules).some((i) => i.field === 'tulla.fixedSuit')).toBe(true)
  })
})

describe('playersForRules', () => {
  it('accepts a player count in range', () => {
    expect(playersForRules(createDefaultThullaRules(), 4)).toEqual([])
  })

  it('rejects a player count out of range', () => {
    const issues = playersForRules(createDefaultThullaRules(), 12)
    expect(issues).toHaveLength(1)
  })
})
