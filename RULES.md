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

## House rule: Neighbor Card Request

Confirmed directly by the table this app was built for, and implemented as
an opt-in rule (`neighborCardRequest.enabled`) — on by default in the
"Classic + Neighbor Request" template, off in the plain "Classic Baavi
Tulla" template:

> If your **immediate seat-neighbor** (the player directly to your left or
> right — not just anyone) plays a **Thulla** in a trick that **you end up
> winning** (so you're the one forced to pick it up), you earn a standing
> **right to request that neighbor's entire hand**. You can cash it in on
> any later turn where **you are leading a fresh trick**: instead of leading
> a card, you demand it, every card in their hand moves to yours, they're
> left holding zero cards and **escape immediately**, and your turn is
> spent — the next still-active player leads the following trick.

Implementation notes / explicit scope, so nothing here is a silent guess:

- The right is earned **per qualifying incident** and **per specific
  neighbor** — if it happens twice, you can cash in twice (each use
  consumes one earned right against that neighbor). It never expires on its
  own; it's only consumed by using it.
- Only seat-*adjacent* Thullas count. If a non-neighbor Thullas a trick you
  win, no right is earned.
- The request can only be made when you are the one **leading** (the
  current trick has zero cards played yet) — not mid-trick while following.
  This is the one detail the table didn't fully specify; it was chosen
  because it's the only point in a turn-based trick where "opting out of
  playing a card" doesn't strand an in-progress trick.
- Scope cut: the Monte Carlo strategy engine's simulated opponents
  (`src/game/simulation/botPolicy.ts`) never use this move — they only ever
  play cards. The move is fully real and legal for the human user (tracked
  in state, offered in the UI, shows up in history), but isn't yet factored
  into the numerical recommendation/EV comparison. Flagged here rather than
  silently shipped as "the AI considered this and rejected it."

## Why this matters for strategy

Because winning a **clean** trick is neutral-to-good (your hand shrinks by
one, same as everyone else who played), but winning a **Thulla** trick is bad
(you net *gain* cards, delaying your escape), the correct optimization target
is **not** "maximize tricks won." It is closer to **minimize expected cards
remaining / maximize expected escape rank** over the rest of the round. The
strategy and simulation engines (`src/game/strategy`, `src/game/simulation`)
are built around this objective — see those modules' docs for detail.
