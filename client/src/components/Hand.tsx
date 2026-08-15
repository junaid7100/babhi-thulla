import React, { useState } from "react";
import { Card } from "../types";
import { PlayingCard } from "./PlayingCard";

interface Props {
  hand: Card[];
  legalCardIds: string[];
  isMyTurn: boolean;
  onPlay: (cardId: string) => void;
}

export function Hand({ hand, legalCardIds, isMyTurn, onPlay }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const legalSet = new Set(legalCardIds);

  function handleTap(cardId: string, legal: boolean) {
    if (!isMyTurn || !legal) return;
    if (selected === cardId) {
      onPlay(cardId);
      setSelected(null);
    } else {
      setSelected(cardId);
    }
  }

  const overlap = hand.length > 9;

  return (
    <div className="w-full">
      <div
        className={[
          "flex justify-center items-end px-2 pb-3 pt-6 overflow-x-auto no-scrollbar",
          overlap ? "" : "gap-1.5",
        ].join(" ")}
      >
        {hand.map((card, i) => {
          const legal = !isMyTurn ? false : legalSet.has(card.id);
          return (
            <PlayingCard
              key={card.id}
              card={card}
              size="md"
              interactive={isMyTurn}
              legal={legal}
              selected={selected === card.id}
              onClick={() => handleTap(card.id, legal)}
              style={overlap ? { marginLeft: i === 0 ? 0 : -22 } : undefined}
              className="animate-pop-in"
            />
          );
        })}
      </div>
      {selected && (
        <div className="flex justify-center pb-2">
          <button
            className="text-xs px-3 py-1 rounded-full bg-accent text-white font-semibold"
            onClick={() => {
              onPlay(selected);
              setSelected(null);
            }}
          >
            Play card
          </button>
        </div>
      )}
    </div>
  );
}
