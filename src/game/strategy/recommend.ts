import type { InferenceByPlayer } from '../inference/opponentInference'
import { evaluateLegalMoves, SIMULATION_PRESETS, type CandidateEvaluation, type SimulationLevel } from '../simulation/monteCarlo'
import type { GameState } from '../state/types'
import { computeStrategyFeatures, type StrategyFeatures } from './evaluate'

export type ConfidenceStars = 1 | 2 | 3 | 4 | 5

export const CONFIDENCE_LABELS: Record<ConfidenceStars, string> = {
  5: 'Excellent',
  4: 'Strong',
  3: 'Reasonable',
  2: 'Risky',
  1: 'Poor',
}

export interface RankedCandidate {
  evaluation: CandidateEvaluation
  features: StrategyFeatures
  confidence: ConfidenceStars
}

export interface Recommendation {
  playerId: string
  best: RankedCandidate
  alternatives: RankedCandidate[]
  simulationLevel: SimulationLevel
  simulationsRun: number
}

function scoreGapToConfidence(gap: number): ConfidenceStars {
  if (gap >= 3) return 5
  if (gap >= 1.5) return 4
  if (gap >= 0.7) return 3
  if (gap >= 0.25) return 2
  return 1
}

export interface RecommendOptions {
  level?: SimulationLevel
  simulations?: number
  seed?: number
}

/**
 * The top-level strategy API: ranks every legal move for `playerId` using
 * Monte Carlo simulation (never a raw LLM call — see RULES.md /
 * project docs on AI architecture), and packages each with the explainable
 * features and a human-facing confidence rating.
 */
export function recommendMove(state: GameState, inference: InferenceByPlayer, playerId: string, options: RecommendOptions = {}): Recommendation | null {
  const level = options.level ?? 'normal'
  const simulations = options.simulations ?? SIMULATION_PRESETS[level]
  const evaluations = evaluateLegalMoves(state, inference, playerId, { simulations, seed: options.seed })
  if (evaluations.length === 0) return null

  const ranked: RankedCandidate[] = evaluations.map((evaluation, i) => {
    const nextWorse = evaluations[i + 1]
    const gap = nextWorse ? evaluation.meanScore - nextWorse.meanScore : evaluation.meanScore - (evaluations[i - 1]?.meanScore ?? evaluation.meanScore - 5)
    return {
      evaluation,
      features: computeStrategyFeatures(state, inference, playerId, evaluation.card),
      confidence: scoreGapToConfidence(Math.abs(gap)),
    }
  })

  // Confidence in the *top* pick specifically reflects how far ahead it is of the runner-up.
  if (ranked.length > 1) {
    ranked[0].confidence = scoreGapToConfidence(ranked[0].evaluation.meanScore - ranked[1].evaluation.meanScore)
  } else {
    ranked[0].confidence = 5
  }

  return {
    playerId,
    best: ranked[0],
    alternatives: ranked.slice(1),
    simulationLevel: level,
    simulationsRun: simulations,
  }
}
