/**
 * How many cards a seat receives when `deckSize` cards are dealt as evenly as
 * possible across `numPlayers` seats, earlier seats getting the extras. This
 * mirrors `dealCards` in ../cards/deck.ts without needing an actual shuffled
 * deck — the app never sees opponents' cards, only counts.
 */
export function startingHandSize(seat: number, numPlayers: number, deckSize: number): number {
  const base = Math.floor(deckSize / numPlayers)
  const extra = deckSize % numPlayers
  return base + (seat < extra ? 1 : 0)
}
