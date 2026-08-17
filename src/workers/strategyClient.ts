import type { InferenceByPlayer } from '../game/inference/opponentInference'
import type { GameState } from '../game/state/types'
import type { Recommendation, RecommendOptions } from '../game/strategy/recommend'
import type { StrategyWorkerRequest, StrategyWorkerResponse } from './strategyWorker'

let worker: Worker | null = null
let nextRequestId = 1
const pending = new Map<number, (recommendation: Recommendation | null) => void>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./strategyWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<StrategyWorkerResponse>) => {
      const resolve = pending.get(event.data.requestId)
      if (resolve) {
        resolve(event.data.recommendation)
        pending.delete(event.data.requestId)
      }
    }
  }
  return worker
}

/** Computes a recommendation on a background thread; resolves once the worker replies. */
export function computeRecommendationInWorker(
  state: GameState,
  inference: InferenceByPlayer,
  playerId: string,
  options: RecommendOptions,
): Promise<Recommendation | null> {
  return new Promise((resolve) => {
    const requestId = nextRequestId++
    pending.set(requestId, resolve)
    const message: StrategyWorkerRequest = { requestId, state, inference, playerId, options }
    getWorker().postMessage(message)
  })
}
