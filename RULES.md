# Baavi Tulla — Rules Configuration & Assumptions

This document exists because the game "Baavi Tulla" (also transliterated "Bhabhi
Thulla") does not have a single universally-agreed written rulebook. Per the
project's own requirement, **no rule is hard-coded as a silent assumption** —
every rule lives in a `GameRules` object (`src/game/rules/types.ts`) with a
documented default, and the in-app **Rule Validation** screen lets you inspect
and change it before a game starts.

## The central ambiguity: "Tulla" is not a trump suit

A literal reading of "trump" in card-game specs suggests a fixed trump suit
that beats all others. That is **not** how this game works. "Thulla" (Tulla)
is the name of an **event**, not a suit:

> A **Thulla** happens when a player cannot follow the suit that was led and
> is forced to sluff (play) a card of a different suit.

There is no card or suit that automatically wins a trick by virtue of being
"trump." The engine ships two selectable rule modes to make this explicit
rather than assumed:

- **`THULLA_EVENT`** (default, recommended) — the classic mechanic described
  below. This is the mode the strategy engine, UI copy ("Thulla risk",
  "Thulla mode"), and demo game are built around.
- **`TRUMP_SUIT`** — a generic alternate mode with a real designated trump
  suit, provided for completeness/configurability in case your table plays a
  house variant with a trump. The strategy engine supports it but it is not
  the primary, validated path.

If you play a variant that differs from either of these, use the Rule
Validation screen / a custom rule template — do not assume the app silently
guessed correctly.

## Default ruleset (`THULLA_EVENT`), as implemented

- **Deck**: standard 52 cards, 4 suits (♠ ♥ ♦ ♣), 13 ranks.
- **Rank order** (low → high): 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A.
- **Players**: 2–8, configurable. Cards are dealt as evenly as possible; if
  the deck doesn't divide evenly, players earlier in deal order get one extra
  card.
- **Opening card**: the very first trick of the game must be led by whoever
  holds a designated opening card (default: A♠), and they must lead with it.
  This can be disabled per rule template (`requireOpeningCard: false`).
- **Turn order**: fixed seat order, clockwise, skipping any player who has
  already "escaped" (see below).
- **Suit-following**: a player must play a card of the led suit if they hold
  one. If they hold none, they may legally play **any** card in hand — that
  play is a **Thulla**.
- **Trick winner**: the highest-ranked card **of the led suit** wins,
  regardless of what else was sluffed. Off-suit (Thulla) cards can never win
  a trick in this mode.
- **Trick resolution**:
  - If **no** Thulla occurred (everyone followed suit), all cards played in
    the trick are **discarded** from the game entirely. The winner leads the
    next trick. Nobody's hand grows.
  - If a Thulla **did** occur, the trick's winner must **pick up every card
    played in that trick** into their own hand (a punishment for winning
    "dirty"). Exception: by default the **first trick of the game** is exempt
    from pickup even if a Thulla occurs (`firstTrickPickupExempt: true`).
- **Escaping**: a player who reaches zero cards in hand "escapes" and is
  removed from the turn rotation for the rest of the round.
- **End of round / loser**: play continues until only one player still holds
  cards. That player is the round's loser, the **"Bhabhi"**. All other
  players are ranked by the order in which they escaped (first to escape =
  best rank).
- **Scoring**: rank-based by default — finishing order is recorded per round;
  a running "times been Bhabhi" tally is kept across rounds in a session. No
  point values beyond rank are assumed unless configured.
- **Dealer**: rotates each round by default; in this variant the dealer has
  no special power beyond dealing (isolated as `dealerHasSpecialRole: false`
  in config in case your table's variant differs).
- **Special cards/actions**: none by default. The config has an (empty by
  default) extension list for house-rule special cards.

## One more isolated assumption: who leads after a winner escapes

If the trick winner's winning card also empties their hand, they win *and*
escape in the same instant. Who leads the next trick? This isn't commonly
documented, so it's an explicit config field (`leaderAfterWinnerEscapes`,
default `NEXT_IN_ORDER`): the next still-active player in seat order after
the now-escaped winner leads instead.

## Why this matters for strategy

Because winning a **clean** trick is neutral-to-good (your hand shrinks by
one, same as everyone else who played), but winning a **Thulla** trick is bad
(you net *gain* cards, delaying your escape), the correct optimization target
is **not** "maximize tricks won." It is closer to **minimize expected cards
remaining / maximize expected escape rank** over the rest of the round. The
strategy and simulation engines (`src/game/strategy`, `src/game/simulation`)
are built around this objective — see those modules' docs for detail.
