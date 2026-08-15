import React, { useEffect, useState } from "react";

interface Props {
  isMyTurn: boolean;
  currentPlayerName: string | null;
  turnDeadline: number | null;
}

export function TurnBanner({ isMyTurn, currentPlayerName, turnDeadline }: Props) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!turnDeadline) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [turnDeadline]);

  return (
    <div className="flex items-center justify-center gap-2 py-1.5" aria-live="polite">
      {isMyTurn ? (
        <span className="font-display font-bold tracking-wide text-accent-light text-sm sm:text-base animate-pulse-ring rounded-full px-3 py-0.5">
          YOUR TURN
        </span>
      ) : (
        <span className="text-sm text-neutral-400">{currentPlayerName ? `${currentPlayerName}'s turn` : "Waiting…"}</span>
      )}
      {secondsLeft !== null && secondsLeft <= 15 && (
        <span className={`text-xs font-mono ${secondsLeft <= 5 ? "text-red-400" : "text-neutral-400"}`}>{secondsLeft}s</span>
      )}
    </div>
  );
}
