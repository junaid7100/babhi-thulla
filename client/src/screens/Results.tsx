import React from "react";
import { useGame } from "../state/GameContext";
import { RoomCodeBadge } from "../components/RoomCodeBadge";

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
}

export function Results() {
  const { results, lobby, playerId, playAgain, leaveRoom } = useGame();

  if (!results) {
    return <div className="min-h-full flex items-center justify-center text-neutral-400 text-sm">Loading results…</div>;
  }

  const isHost = lobby?.hostPlayerId === playerId;

  return (
    <div className="min-h-full flex flex-col items-center px-6 py-10 gap-6">
      <h1 className="font-display text-2xl font-bold tracking-wide">GAME OVER</h1>

      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-neutral-500">Bhabhi</div>
        <div className="font-display text-3xl font-bold text-accent">{results.bhabhiName ?? "—"}</div>
        <div className="text-xs text-neutral-500 mt-1">
          left holding {results.bhabhiCardsRemaining} card{results.bhabhiCardsRemaining === 1 ? "" : "s"}
        </div>
      </div>

      <div className="w-full max-w-xs">
        <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wide">Escaped</div>
        <ol className="flex flex-col gap-1.5">
          {results.escapeOrder.map((e) => (
            <li key={e.playerId} className="flex justify-between bg-felt-800 border border-white/10 rounded-lg px-3 py-2 text-sm">
              <span>
                {e.finishPosition}. {e.displayName}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs text-center text-sm">
        <div className="bg-felt-800 rounded-lg py-2">
          <div className="text-lg font-bold">{results.trickCount}</div>
          <div className="text-[10px] text-neutral-500 uppercase">Tricks</div>
        </div>
        <div className="bg-felt-800 rounded-lg py-2">
          <div className="text-lg font-bold">{results.thullaCount}</div>
          <div className="text-[10px] text-neutral-500 uppercase">Thullas</div>
        </div>
        <div className="bg-felt-800 rounded-lg py-2">
          <div className="text-lg font-bold">{formatDuration(results.durationMs)}</div>
          <div className="text-[10px] text-neutral-500 uppercase">Duration</div>
        </div>
      </div>

      <RoomCodeBadge roomCode={results.roomCode} />

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {isHost ? (
          <button onClick={playAgain} className="w-full py-3 rounded-xl bg-accent hover:bg-accent-dark transition-colors font-semibold text-white">
            Play Again
          </button>
        ) : (
          <p className="text-sm text-neutral-400 text-center">Waiting for the host to start a rematch…</p>
        )}
        <button onClick={leaveRoom} className="w-full py-2.5 rounded-xl bg-felt-800 hover:bg-felt-700 border border-white/10 font-semibold">
          Return to Home
        </button>
      </div>
    </div>
  );
}
