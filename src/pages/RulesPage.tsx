import { useGameStore } from '@/store/gameStore'
import { Card, Pill, Screen } from '@/components/ui'
import { RULE_TEMPLATES } from '@/game/rules/defaultRules'
import { validateRules } from '@/game/rules/validateRules'
import { SUIT_NAME } from '@/game/cards/types'

export function RulesPage() {
  const navigate = useGameStore((s) => s.navigate)

  return (
    <Screen title="Rule Validation" onBack={() => navigate('home')}>
      <div className="lg:mx-auto lg:max-w-3xl">
      <p className="mb-4 text-xs text-slate-500 lg:text-sm">
        Baavi Tulla has no single universal rulebook — every rule the strategy engine relies on is listed explicitly here rather than
        assumed. See RULES.md in the project for the full write-up.
      </p>
      <div className="flex flex-col gap-4">
        {RULE_TEMPLATES.map((rules) => {
          const issues = validateRules(rules)
          return (
            <Card key={rules.id}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{rules.name}</p>
                {issues.length === 0 ? <Pill tone="good">Valid</Pill> : <Pill tone="bad">{issues.length} issue(s)</Pill>}
              </div>
              <p className="mt-1 text-xs text-slate-400">{rules.description}</p>

              <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                <Row label="Deck">{rules.deckSize} cards, {rules.suits.length} suits</Row>
                <Row label="Players">{rules.minPlayers}–{rules.maxPlayers}</Row>
                <Row label="Rank order">{rules.rankOrder.join(' < ')}</Row>
                <Row label="Tulla mode">{rules.tulla.mode === 'THULLA_EVENT' ? 'Classic (no trump)' : `Trump: ${rules.tulla.mode === 'TRUMP_SUIT' ? rules.tulla.fixedSuit && SUIT_NAME[rules.tulla.fixedSuit] : ''}`}</Row>
                <Row label="Opening lead">{rules.openingLead.required ? `Required: ${rules.openingLead.card}` : 'Not required'}</Row>
                <Row label="Pickup on Thulla">
                  {rules.tulla.mode === 'THULLA_EVENT' ? (rules.tulla.winnerPicksUpOnThulla ? 'Yes' : 'No') : 'N/A'}
                </Row>
                <Row label="First trick exempt">
                  {rules.tulla.mode === 'THULLA_EVENT' ? (rules.tulla.firstTrickPickupExempt ? 'Yes' : 'No') : 'N/A'}
                </Row>
                <Row label="Round ends when">≤ {rules.roundEndsWhenPlayersRemaining} player(s) hold cards</Row>
                <Row label="Dealer rotates">{rules.dealerRotates ? 'Yes' : 'No'}</Row>
                <Row label="Scoring">{rules.scoring.method}, Bhabhi tally: {rules.scoring.trackBhabhiTally ? 'on' : 'off'}</Row>
                <Row label="Special cards">{rules.specialCards.length === 0 ? 'None' : rules.specialCards.map((c) => c.cardId).join(', ')}</Row>
              </dl>

              {issues.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-red-400">
                  {issues.map((i) => (
                    <li key={i.field}>
                      {i.field}: {i.message}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )
        })}
      </div>
      </div>
    </Screen>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-200">{children}</dd>
    </>
  )
}
