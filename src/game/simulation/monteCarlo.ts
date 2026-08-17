import { createRng } from '../cards/deck'
import type { Card } from '../cards/types'
import type { InferenceByPlayer } from '../inference/opponentInference'
import type { GameState } from '../state/types'
import { getLegalMoves } from '../validation/legalMoves'
import { sampleOpponentHands } from './handSampling'
import { runRollout } from './rollout'
import { buildSimWorld } from './simWorld'

/**
 * Simulation-count presets. The master spec suggests 500/2,000/10,000; these
 * are tuned down slightly so `normal` comfortably finishes on the main
 * thread within the <1s target on modest phone hardware, while `high` is
 * expected to run via a Web Worker (see src/workers) rather than block the
 * UI. Always configurable — never a silent hard-coded assumption.
 */
export const SIMULATION_PRESETS = {
  development: 300,
  normal: 900,
  high: 4000,
} as const

export type SimulationLevel = keyof typeof SIMULATION_PRESETS

export interface CandidateEvaluation {
  card: Card
  simulations: number
  /** Higher is better. Combines final hand size and Bhabhi risk into one comparable number. */
  meanScore: number
  winCurrentTrickProb: number
  thullaProb: number
  meanFinalCardsRemaining: number
  bhabhiProb: number
  meanCardsPickedUp: number
}

function scoreOutcome(outcome: { rootFinalCardsRemaining: number; rootWasBhabhi: boolean }): number {
  return -outcome.rootFinalCardsRemaining - (outcome.rootWasBhabhi ? 6 : 0)
}

export interface RunSimulationOptions {
  simulations: number
  seed?: number
}

/**
 * Evaluates every legal candidate card for `rootPlayerId` by running Monte
 * Carlo rollouts: for each of `simulations` sampled worlds (a plausible full
 * deal consistent with everything currently known/inferred), every
 * candidate is tried from that *same* sampled world (common random numbers),
 * which reduces noise when comparing candidates against each other.
 */
export function evaluateCandidates(
  state: GameState,
  inference: InferenceByPlayer,
  rootPlayerId: string,
  candidates: Card[],
  options: RunSimulationOptions,
): CandidateEvaluation[] {
  const rng = createRng(options.seed ?? 1)
  const totals = new Map<
    string,
    { card: Card; scoreSum: number; wins: number; thullas: number; cardsSum: number; bhabhis: number; pickedUpSum: number; n: number }
  >()
  for (const c of candidates) {
    totals.set(c.id, { card: c, scoreSum: 0, wins: 0, thullas: 0, cardsSum: 0, bhabhis: 0, pickedUpSum: 0, n: 0 })
  }

  for (let i = 0; i < options.simulations; i++) {
    const sampledHands = sampleOpponentHands(state, inference, rng)
    const baseWorld = buildSimWorld(state, sampledHands)
    for (const candidate of candidates) {
      const outcome = runRollout(baseWorld, state.rules, rootPlayerId, candidate, rng)
      const t = totals.get(candidate.id)!
      t.n++
      t.scoreSum += scoreOutcome(outcome)
      if (outcome.wonCurrentTrick) t.wins++
      if (outcome.currentTrickHadThulla) t.thullas++
      t.cardsSum += outcome.rootFinalCardsRemaining
      if (outcome.rootWasBhabhi) t.bhabhis++
      t.pickedUpSum += outcome.rootCardsPickedUpTotal
    }
  }

  return [...totals.values()]
    .map((t) => ({
      card: t.card,
      simulations: t.n,
      meanScore: t.n > 0 ? t.scoreSum / t.n : 0,
      winCurrentTrickProb: t.n > 0 ? t.wins / t.n : 0,
      thullaProb: t.n > 0 ? t.thullas / t.n : 0,
      meanFinalCardsRemaining: t.n > 0 ? t.cardsSum / t.n : 0,
      bhabhiProb: t.n > 0 ? t.bhabhis / t.n : 0,
      meanCardsPickedUp: t.n > 0 ? t.pickedUpSum / t.n : 0,
    }))
    .sort((a, b) => b.meanScore - a.meanScore)
}

/** Convenience wrapper: candidates are simply the root player's current legal moves. */
export function evaluateLegalMoves(
  state: GameState,
  inference: InferenceByPlayer,
  rootPlayerId: string,
  options: RunSimulationOptions,
): CandidateEvaluation[] {
  const player = state.players.find((p) => p.id === rootPlayerId)
  if (!player) return []
  const leadSuit = state.currentTrick?.leadSuit ?? null
  const candidates = getLegalMoves(player.hand, leadSuit)
  return evaluateCandidates(state, inference, rootPlayerId, candidates, options)
}
