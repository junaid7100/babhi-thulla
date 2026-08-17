/**
 * Given, for each still-active opponent, the set of cards that could still
 * be in their hand and how many still-unidentified cards they hold, estimate
 * P(player holds card) for every (card, eligible player) pair.
 *
 * This is deliberately an approximation, not exact combinatorics (computing
 * the true hypergeometric-with-constraints distribution is a permanent-of-a-
 * matrix problem — expensive and not worth it at table-game scale). We use
 * iterative proportional fitting (a small number of alternating row/column
 * normalization passes) so that:
 *   - for each card, probabilities across eligible players sum to 1
 *     (the card belongs to exactly one of them)
 *   - for each player, probabilities across their eligible cards sum to
 *     their count of not-yet-identified cards
 * Symmetric, indistinguishable candidates converge to equal probabilities,
 * per the "don't fabricate precision" requirement.
 */
export function estimateProbabilities(
  possibleByPlayer: Record<string, string[]>,
  unresolvedSlotsByPlayer: Record<string, number>,
  iterations = 25,
): Record<string, Record<string, number>> {
  const players = Object.keys(possibleByPlayer)
  const prob: Record<string, Record<string, number>> = {}

  for (const playerId of players) {
    const cards = possibleByPlayer[playerId]
    for (const cardId of cards) {
      prob[cardId] ??= {}
      prob[cardId][playerId] = cards.length > 0 ? 1 / cards.length : 0
    }
  }

  for (let iter = 0; iter < iterations; iter++) {
    // Column pass: for each card, eligible players' probabilities sum to 1.
    for (const cardId of Object.keys(prob)) {
      const row = prob[cardId]
      const sum = Object.values(row).reduce((a, b) => a + b, 0)
      if (sum > 0) {
        for (const playerId of Object.keys(row)) row[playerId] = row[playerId] / sum
      }
    }
    // Row pass: for each player, sum across their eligible cards matches their unresolved slot count.
    const rowSums: Record<string, number> = {}
    for (const playerId of players) rowSums[playerId] = 0
    for (const cardId of Object.keys(prob)) {
      for (const [playerId, p] of Object.entries(prob[cardId])) {
        rowSums[playerId] = (rowSums[playerId] ?? 0) + p
      }
    }
    for (const cardId of Object.keys(prob)) {
      for (const playerId of Object.keys(prob[cardId])) {
        const target = unresolvedSlotsByPlayer[playerId] ?? 0
        const current = rowSums[playerId]
        if (current > 0) {
          prob[cardId][playerId] = (prob[cardId][playerId] / current) * target
        }
      }
    }
  }

  // Final column re-normalization so each card's probabilities sum to 1 (or 0 if no eligible players).
  for (const cardId of Object.keys(prob)) {
    const row = prob[cardId]
    const sum = Object.values(row).reduce((a, b) => a + b, 0)
    if (sum > 0) {
      for (const playerId of Object.keys(row)) row[playerId] = Math.max(0, Math.min(1, row[playerId] / sum))
    }
  }

  return prob
}
