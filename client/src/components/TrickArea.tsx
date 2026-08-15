import React from "react";
import { TrickCard } from "../types";
import { PlayingCard } from "./PlayingCard";

interface Props {
  trick: TrickCard[];
  leadSuit: string | null;
}

export function TrickArea({ trick, leadSuit }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[7.5rem] py-2">
      {trick.length === 0 ? (
        <div className="text-xs text-neutral-500 italic">Waiting for the next card…</div>
      ) : (
        <div className="flex flex-wrap justify-center gap-2 max-w-md">
          {trick.map((t) => (
            <div key={t.playerId} className="flex flex-col items-center gap-1 animate-pop-in">
              <PlayingCard card={t.card} size="md" />
              <span className="text-[10px] text-neutral-400 truncate max-w-[4rem]">{t.displayName}</span>
            </div>
          ))}
        </div>
      )}
      {leadSuit && <div className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500">Lead suit locked</div>}
    </div>
  );
}
