import { randomInt } from "crypto";
import { getLegalCards } from "../engine/engine";
import { Card, PlayedCard, Suit } from "../engine/types";
import { RULES } from "../engine/rules";

/** Picks a uniformly random legal card for a bot turn or an auto-played (timed-out) turn. */
export function pickAutoCard(hand: Card[], leadSuit: Suit | null, currentTrick: PlayedCard[], firstTrick: boolean): string {
  if (firstTrick && currentTrick.length === 0) {
    const ace = hand.find((c) => c.id === RULES.startingCard);
    if (ace) return ace.id;
  }
  const effectiveLeadSuit = currentTrick.length === 0 ? null : leadSuit;
  const legal = getLegalCards(hand, effectiveLeadSuit);
  const pool = legal.length > 0 ? legal : hand;
  return pool[randomInt(0, pool.length)].id;
}
