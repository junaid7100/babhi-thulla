const { getLegalCardIds } = require("./gameEngine");

// Picks a card for a bot to play: follows the same legality rules the human client
// uses (must lead A♠ on the very first card of the game, otherwise follow suit if possible).
function pickBotCard(hand, leadSuit, currentTrick, firstTrick) {
  const mustLeadAceOfSpades = firstTrick && currentTrick.length === 0;
  if (mustLeadAceOfSpades) {
    const ace = hand.find((c) => c.id === "AS");
    if (ace) return ace.id;
    return hand[Math.floor(Math.random() * hand.length)].id;
  }
  const effectiveLeadSuit = currentTrick.length === 0 ? null : leadSuit;
  const legalIds = getLegalCardIds(hand, effectiveLeadSuit);
  return legalIds[Math.floor(Math.random() * legalIds.length)];
}

module.exports = { pickBotCard };
