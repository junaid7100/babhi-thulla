import { useState } from 'react'
import type { GameState } from '@/game/state/types'
import type { Recommendation } from '@/game/strategy/recommend'
import { CONFIDENCE_LABELS } from '@/game/strategy/recommend'
import { explainAdvanced, explainCandidate } from '@/game/explain/explainMove'
import { renderStars } from '@/game/explain/confidence'
import { cardLabel } from '@/game/cards/card'
import { PlayingCard } from './PlayingCard'
import { Button, Card, Pill } from './ui'

export function RecommendationPanel({
  state,
  recommendation,
  loading,
  simulationsPlanned,
  onPlay,
}: {
  state: GameState
  recommendation: Recommendation | null
  loading: boolean
  simulationsPlanned?: number
  onPlay: (cardId: string) => void
}) {
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)

  if (loading || !recommendation) {
    return (
      <Card className="mb-4 flex items-center gap-3">
        <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        <p className="text-sm text-slate-300">
          Analyzing {simulationsPlanned ? simulationsPlanned.toLocaleString() : ''} possible futures…
        </p>
      </Card>
    )
  }

  const { best, alternatives } = recommendation
  const bullets = explainCandidate(state, best)
  const advanced = explainAdvanced(state, best)

  return (
    <Card className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Best Move</p>
      <div className="mt-2 flex items-center gap-4">
        <PlayingCard card={best.evaluation.card} size="lg" onClick={() => onPlay(best.evaluation.card.id)} />
        <div>
          <p className="text-lg text-amber-300" aria-label={`Confidence: ${CONFIDENCE_LABELS[best.confidence]}`}>
            {renderStars(best.confidence)}
          </p>
          <p className="text-xs text-slate-400">{CONFIDENCE_LABELS[best.confidence]} confidence</p>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-sm text-slate-300">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-amber-400">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <Button className="mt-3 w-full" onClick={() => onPlay(best.evaluation.card.id)}>
        Play {cardLabel(best.evaluation.card)}
      </Button>

      {alternatives.length > 0 && (
        <div className="mt-3">
          <button className="text-xs text-slate-400 underline" onClick={() => setShowAlternatives((v) => !v)}>
            {showAlternatives ? 'Hide' : 'Show'} {alternatives.length} alternative{alternatives.length === 1 ? '' : 's'}
          </button>
          {showAlternatives && (
            <div className="mt-2 flex flex-col gap-2">
              {alternatives.map((alt, i) => (
                <div key={alt.evaluation.card.id} className="flex items-center justify-between rounded-lg bg-slate-800/60 px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <PlayingCard card={alt.evaluation.card} size="sm" onClick={() => onPlay(alt.evaluation.card.id)} />
                    <span className="text-xs text-slate-400">Alternative {i + 1}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-300">EV {alt.evaluation.meanScore.toFixed(2)}</p>
                    <Pill tone="default">{renderStars(alt.confidence)}</Pill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 border-t border-slate-800 pt-2">
        <button className="text-xs text-slate-400 underline" onClick={() => setShowAnalysis((v) => !v)}>
          {showAnalysis ? 'Hide' : 'Show'} advanced analysis
        </button>
        {showAnalysis && (
          <div className="mt-2 space-y-2 text-xs text-slate-400">
            <p>
              <span className="font-semibold text-slate-300">Expected value:</span> {best.evaluation.meanScore.toFixed(2)} (
              {best.evaluation.simulations} simulations)
            </p>
            <p>
              <span className="font-semibold text-slate-300">Main risk:</span> {advanced.mainRisk}
            </p>
            <p>
              <span className="font-semibold text-slate-300">Main advantage:</span> {advanced.mainAdvantage}
            </p>
            <p>
              <span className="font-semibold text-slate-300">Strategic objective:</span> {advanced.strategicObjective}
            </p>
            <p>
              <span className="font-semibold text-slate-300">Win-this-trick probability:</span>{' '}
              {Math.round(best.evaluation.winCurrentTrickProb * 100)}% · Thulla probability:{' '}
              {Math.round(best.evaluation.thullaProb * 100)}% · Bhabhi risk: {Math.round(best.evaluation.bhabhiProb * 100)}%
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
