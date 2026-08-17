import { recommendMove, type RecommendOptions } from '../game/strategy/recommend'
import type { InferenceByPlayer } from '../game/inference/opponentInference'
import type { GameState } from '../game/state/types'

export interface StrategyWorkerRequest {
  requestId: number
  state: GameState
  inference: InferenceByPlayer
  playerId: string
  options: RecommendOptions
}

export interface StrategyWorkerResponse {
  requestId: number
  recommendation: ReturnType<typeof recommendMove>
}

/**
 * Runs the Monte Carlo strategy engine off the main thread so the UI never
 * freezes while "normal"/"high" accuracy simulations run (spec §16/§32).
 */
self.onmessage = (event: MessageEvent<StrategyWorkerRequest>) => {
  const { requestId, state, inference, playerId, options } = event.data
  const recommendation = recommendMove(state, inference, playerId, options)
  const response: StrategyWorkerResponse = { requestId, recommendation }
  self.postMessage(response)
}
