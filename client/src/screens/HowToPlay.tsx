import React from "react";
import { useGame } from "../state/GameContext";

const STEPS: { title: string; body: string }[] = [
  { title: "Objective", body: "Get rid of every card in your hand. The last player still holding cards is the Bhabhi (loser)." },
  { title: "Card ranking", body: "Standard 52-card deck, no jokers, no trump. Within a suit: A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2." },
  { title: "A♠ starts", body: "Whoever holds the Ace of Spades leads the very first trick, and must lead with it." },
  { title: "Follow suit", body: "Each trick, the leader plays any card, setting the lead suit. Everyone else must play that suit if they have it." },
  { title: "What's a Thulla?", body: "If you don't have the lead suit, you may play any other suit — that's a Thulla." },
  { title: "A Thulla ends the trick", body: "The moment a Thulla is played, the trick stops immediately. Remaining players don't get to play." },
  { title: "Who picks up the pile", body: "Whoever played the highest card of the original lead suit wins — and picks up every card played in that trick into their hand." },
  { title: "No Thulla? Discard.", body: "If everyone follows suit, the highest lead-suit card just wins the lead. Those cards are discarded, not picked up." },
  { title: "Escaping", body: "The moment your hand is empty, you escape — you're done for the rest of the game." },
  { title: "The Bhabhi", body: "When only one player still has cards, that player is the Bhabhi." },
];

export function HowToPlay() {
  const { setScreen } = useGame();

  return (
    <div className="min-h-full flex flex-col items-center px-6 py-10 gap-6">
      <h1 className="font-display text-2xl font-bold">How to Play</h1>
      <ol className="w-full max-w-md flex flex-col gap-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="bg-felt-800 border border-white/10 rounded-lg px-4 py-3">
            <div className="text-xs text-accent-light font-semibold">
              {i + 1}. {s.title}
            </div>
            <div className="text-sm text-neutral-300 mt-0.5">{s.body}</div>
          </li>
        ))}
      </ol>
      <button
        onClick={() => setScreen("home")}
        className="w-full max-w-xs py-3 rounded-xl bg-accent hover:bg-accent-dark transition-colors font-semibold text-white"
      >
        Got it
      </button>
    </div>
  );
}
