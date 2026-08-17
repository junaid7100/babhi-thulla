import type { CardLedger } from '@/game/ledger/cardLedger'
import { cardsRemainingBySuit, highCardsRemaining } from '@/game/ledger/cardLedger'
import { SUIT_NAME, SUIT_SYMBOL, SUITS } from '@/game/cards/types'
import { Card } from './ui'

export function CardCountingPanel({ ledger }: { ledger: CardLedger }) {
  const bySuit = cardsRemainingBySuit(ledger)
  const highCards = highCardsRemaining(ledger)

  return (
    <Card>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Card Counting</p>
      <div className="grid grid-cols-4 gap-2 text-center">
        {SUITS.map((s) => (
          <div key={s} className="rounded-lg bg-slate-800/60 py-2">
            <p className="text-lg">{SUIT_SYMBOL[s]}</p>
            <p className="text-sm font-semibold">{bySuit[s] ?? 0}</p>
            <p className="text-[10px] text-slate-500">{SUIT_NAME[s]}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-slate-400">High cards remaining</p>
      <div className="mt-1 flex gap-3 text-sm">
        {['A', 'K', 'Q', 'J'].map((r) => (
          <span key={r}>
            {r}: <span className="font-semibold">{highCards[r] ?? 0}</span>
          </span>
        ))}
      </div>
    </Card>
  )
}
