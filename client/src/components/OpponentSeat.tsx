import React from "react";
import { PublicPlayer } from "../types";

interface Props {
  player: PublicPlayer;
  isHost: boolean;
  compact?: boolean;
}

export function OpponentSeat({ player, isHost, compact }: Props) {
  const initial = player.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={[
        "flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-shadow",
        player.isCurrentTurn ? "animate-pulse-ring bg-felt-800/70" : "",
        player.escaped ? "opacity-50" : "",
      ].join(" ")}
      aria-current={player.isCurrentTurn ? "true" : undefined}
    >
      <div className="relative">
        <div
          className={[
            "flex items-center justify-center rounded-full font-display font-bold",
            compact ? "w-9 h-9 text-sm" : "w-11 h-11 text-base",
            player.isCurrentTurn ? "bg-accent text-white" : "bg-felt-700 text-neutral-200",
            !player.connected ? "grayscale" : "",
          ].join(" ")}
        >
          {initial}
        </div>
        {!player.connected && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-neutral-500 border-2 border-felt-950"
            title="Disconnected"
            aria-label="Disconnected"
          />
        )}
        {player.escaped && (
          <span className="absolute -top-1 -right-1 text-[10px] bg-emerald-600 text-white rounded-full px-1" title="Escaped">
            OUT
          </span>
        )}
      </div>
      <div className="text-center leading-tight">
        <div className="text-xs font-medium truncate max-w-[72px]">
          {player.displayName}
          {isHost && <span className="ml-1 text-accent-light" title="Host">★</span>}
        </div>
        <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-400">
          <span className="inline-block w-2.5 h-3.5 rounded-[2px] bg-gradient-to-br from-accent-dark to-accent" aria-hidden="true" />
          <span>{player.cardCount} card{player.cardCount === 1 ? "" : "s"}</span>
        </div>
      </div>
      {player.isCurrentTurn && !player.escaped && (
        <div className="text-[10px] uppercase tracking-wide text-accent-light font-semibold">{player.displayName}'s turn</div>
      )}
    </div>
  );
}
