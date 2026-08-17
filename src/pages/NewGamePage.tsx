import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Button, Screen } from '@/components/ui'
import { RULE_TEMPLATES } from '@/game/rules/defaultRules'
import { validateRules, playersForRules } from '@/game/rules/validateRules'
import type { PlayerSetup } from '@/game/state/types'

export function NewGamePage() {
  const navigate = useGameStore((s) => s.navigate)
  const setPendingNewGame = useGameStore((s) => s.setPendingNewGame)
  const settings = useGameStore((s) => s.settings)

  const [gameName, setGameName] = useState('')
  const [numPlayers, setNumPlayers] = useState(4)
  const [names, setNames] = useState<string[]>(['Ali', 'Sara', 'Ahmed', 'Priya', 'Zain', 'Neha', 'Omar'])
  const [dealerSeat, setDealerSeat] = useState(0)
  const [rulesId, setRulesId] = useState(RULE_TEMPLATES[0].id)

  const rules = RULE_TEMPLATES.find((r) => r.id === rulesId) ?? RULE_TEMPLATES[0]
  const playerIssues = playersForRules(rules, numPlayers)
  const ruleIssues = validateRules(rules)

  const startingSeat = (dealerSeat + 1) % numPlayers

  const handleContinue = () => {
    const players: PlayerSetup[] = [{ id: 'you', name: settings.defaultUserName || 'You', seat: 0, isUser: true }]
    for (let i = 1; i < numPlayers; i++) {
      players.push({ id: `p${i}`, name: names[i - 1] || `Player ${i + 1}`, seat: i, isUser: false })
    }
    const dealerPlayerId = players.find((p) => p.seat === dealerSeat)!.id
    const startingPlayerId = players.find((p) => p.seat === startingSeat)!.id

    setPendingNewGame({
      config: {
        gameName: gameName.trim() || 'Baavi Tulla',
        rules,
        players,
        userPlayerId: 'you',
        dealerPlayerId,
        startingPlayerId,
      },
    })
    navigate('hand-entry')
  }

  return (
    <Screen title="New Game" onBack={() => navigate('home')}>
      <div className="flex flex-col gap-5 lg:mx-auto lg:max-w-2xl lg:gap-6">
        <Field label="Game name (optional)">
          <input
            className="input"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Friday night game"
          />
        </Field>

        <Field label={`Players: ${numPlayers}`}>
          <div className="flex items-center gap-3">
            <Button variant="secondary" className="px-4 py-2" onClick={() => setNumPlayers((n) => Math.max(rules.minPlayers, n - 1))}>
              −
            </Button>
            <span className="w-8 text-center text-lg font-semibold">{numPlayers}</span>
            <Button variant="secondary" className="px-4 py-2" onClick={() => setNumPlayers((n) => Math.min(rules.maxPlayers, n + 1))}>
              +
            </Button>
          </div>
          {playerIssues.map((issue) => (
            <p key={issue.field} className="mt-1 text-xs text-amber-400">
              {issue.message}
            </p>
          ))}
        </Field>

        <Field label="You are seat 1 (dealt as 'You'). Other players:">
          <div className="flex flex-col gap-2">
            {Array.from({ length: numPlayers - 1 }).map((_, i) => (
              <input
                key={i}
                className="input"
                value={names[i] ?? ''}
                onChange={(e) => {
                  const next = [...names]
                  next[i] = e.target.value
                  setNames(next)
                }}
                placeholder={`Player ${i + 2}`}
              />
            ))}
          </div>
        </Field>

        <Field label="Dealer">
          <select className="input" value={dealerSeat} onChange={(e) => setDealerSeat(Number(e.target.value))}>
            {Array.from({ length: numPlayers }).map((_, seat) => (
              <option key={seat} value={seat}>
                {seat === 0 ? settings.defaultUserName || 'You' : names[seat - 1] || `Player ${seat + 1}`}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            The player to the dealer's left starts the first trick — you can correct this later if needed.
          </p>
        </Field>

        <Field label="Ruleset">
          <select className="input" value={rulesId} onChange={(e) => setRulesId(e.target.value)}>
            {RULE_TEMPLATES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button className="mt-1 text-xs text-amber-400 underline" onClick={() => navigate('rules')}>
            View full rule details
          </button>
          {ruleIssues.length > 0 && <p className="mt-1 text-xs text-red-400">This ruleset has configuration issues — check Rule Validation.</p>}
        </Field>

        <Button
          className="mt-4"
          disabled={playerIssues.length > 0 || ruleIssues.length > 0}
          onClick={handleContinue}
        >
          Continue to Hand Entry →
        </Button>
      </div>
    </Screen>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  )
}
