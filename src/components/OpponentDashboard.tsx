import type { GameState } from '@/game/state/types'
import type { InferenceByPlayer } from '@/game/inference/opponentInference'
import { cardLabel } from '@/game/cards/card'
import { SUIT_NAME, SUITS, type Suit } from '@/game/cards/types'
import { Card, Pill } from './ui'

function threatLevel(inf: InferenceByPlayer[string]): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (inf.cardsRemaining <= 2) return 'HIGH'
  const strongCount = [...inf.knownCards, ...inf.possibleCards].filter((c) => c.value >= 13).length
  if (strongCount >= 3) return 'HIGH'
  if (strongCount >= 1) return 'MEDIUM'
  return 'LOW'
}

export function OpponentDashboard({ state, inference }: { state: GameState; inference: InferenceByPlayer }) {
  const opponents = state.players.filter((p) => !p.isUser)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opponent Analysis</p>
      {opponents.map((p) => {
        const inf = inference[p.id]
        if (!inf) return null
        const likely = [...inf.possibleCards]
          .sort((a, b) => (inf.probabilities[b.id] ?? 0) - (inf.probabilities[a.id] ?? 0))
          .slice(0, 3)
        const voidSuits: Suit[] = SUITS.filter((s) => p.voidSuits.includes(s))
        const threat = p.escaped ? null : threatLevel(inf)

        return (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <p className="font-semibold uppercase">{p.name}</p>
              {p.escaped ? (
                <Pill tone="good">Escaped</Pill>
              ) : (
                threat && <Pill tone={threat === 'HIGH' ? 'bad' : threat === 'MEDIUM' ? 'warn' : 'default'}>Threat: {threat}</Pill>
              )}
            </div>
            {!p.escaped && (
              <>
                <p className="mt-1 text-xs text-slate-400">Cards remaining: {inf.cardsRemaining}</p>
                {inf.knownCards.length > 0 && (
                  <p className="mt-1 text-xs text-slate-300">
                    Known: <span className="font-medium">{inf.knownCards.map(cardLabel).join(', ')}</span>
                  </p>
                )}
                {likely.length > 0 && (
                  <p className="mt-1 text-xs text-slate-300">
                    Likely:{' '}
                    {likely
                      .map((c) => `${cardLabel(c)} ${Math.round((inf.probabilities[c.id] ?? 0) * 100)}%`)
                      .join(', ')}
                  </p>
                )}
                {voidSuits.length > 0 && (
                  <p className="mt-1 text-xs text-slate-300">
                    Likely void: <span className="font-medium">{voidSuits.map((s) => SUIT_NAME[s]).join(', ')}</span>
                  </p>
                )}
              </>
            )}
          </Card>
        )
      })}
    </div>
  )
}
