import type { GameRules } from './types'

export interface RuleValidationIssue {
  field: string
  message: string
}

export function validateRules(rules: GameRules): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = []

  if (rules.minPlayers < 2) {
    issues.push({ field: 'minPlayers', message: 'At least 2 players are required.' })
  }
  if (rules.maxPlayers < rules.minPlayers) {
    issues.push({ field: 'maxPlayers', message: 'maxPlayers must be >= minPlayers.' })
  }
  if (rules.suits.length === 0) {
    issues.push({ field: 'suits', message: 'At least one suit is required.' })
  }
  if (rules.ranks.length === 0) {
    issues.push({ field: 'ranks', message: 'At least one rank is required.' })
  }
  if (rules.rankOrder.length !== rules.ranks.length) {
    issues.push({ field: 'rankOrder', message: 'rankOrder must include every rank exactly once.' })
  }
  if (rules.openingLead.required && !rules.openingLead.card) {
    issues.push({ field: 'openingLead.card', message: 'An opening lead card must be set when required.' })
  }
  if (rules.tulla.mode === 'TRUMP_SUIT') {
    if (rules.tulla.determination === 'FIXED' && !rules.tulla.fixedSuit) {
      issues.push({ field: 'tulla.fixedSuit', message: 'A fixed trump suit must be set for FIXED determination.' })
    }
  }
  if (rules.roundEndsWhenPlayersRemaining < 1) {
    issues.push({
      field: 'roundEndsWhenPlayersRemaining',
      message: 'roundEndsWhenPlayersRemaining must be at least 1.',
    })
  }

  return issues
}

export function playersForRules(rules: GameRules, requestedPlayers: number): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = []
  if (requestedPlayers < rules.minPlayers || requestedPlayers > rules.maxPlayers) {
    issues.push({
      field: 'players',
      message: `This ruleset supports ${rules.minPlayers}-${rules.maxPlayers} players (got ${requestedPlayers}).`,
    })
  }
  return issues
}
