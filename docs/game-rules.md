# Bhabhi Thulla — Canonical Rules

Researched against multiple published rule references (see Sources) and cross-checked against `backend/gameEngine.js` + its test suite (`backend/gameEngine.test.js`, 17 passing tests).

- Standard 52-card deck, no jokers, no trump suit.
- Ranking within a suit, high to low: **A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2**.
- 3–5 players. Deal all cards as evenly as possible (some players get one extra card).
- Whoever holds the **Ace of Spades** leads the very first trick, and must lead with it.
- Each trick, the leader plays any card, setting the **lead suit**. Every other active player must follow that suit if they can.
- **Can't follow suit → Thulla.** The trick ends immediately (no one after the Thulla-maker plays). The player who played the **highest card of the lead suit** in that trick picks up **every card played in the trick** into their hand and leads next.
- **Everyone follows suit (no Thulla):** highest lead-suit card just wins the lead; all cards in that trick are discarded (removed from play, no one's hand grows).
- **First-trick exception:** the first trick of the game is always discarded, even if it's technically a Thulla — the leader never gets punished for the A♠ opening.
- **Escape:** the instant a player's hand reaches 0 cards, they're out of the rotation (recorded with a finish position) and can never receive cards again (including via a later Thulla pickup).
- **Bhabhi:** when only one active player remains, they're the Bhabhi — the loser. Game ends.

## Sources

- [Online Bhabhi Card Game — CardBaazi](https://www.cardbaazi.com/bhabhi-card-game)
- [Bhabhi Card Game Rules — Zymbiotic Technologies](https://www.zymbiotic.com/bhabhi/rules/)
- [Bhabhi Thulla – Play Classic Indian Card Games](https://playcardgames.io/2025/04/24/bhabhi-thulla/)
- [Bhabhi Card Game Online — Rules, Strategy, and Multiplayer Play](https://thulla.site/bhabhi-card-game.html)
