import React from "react";
import { useGame } from "../state/GameContext";
import { RoomCodeBadge } from "../components/RoomCodeBadge";

export function Lobby() {
  const { lobby, playerId, startGame, leaveRoom, setScreen } = useGame();

  if (!lobby) {
    return (
      <div className="min-h-full flex items-center justify-center text-neutral-400 text-sm">Loading room…</div>
    );
  }

  const isHost = lobby.hostPlayerId === playerId;
  const canStart = lobby.players.length >= 3;

  return (
    <div className="min-h-full flex flex-col items-center px-6 py-10 gap-6">
      <h1 className="font-display text-2xl font-bold">Bhabhi Thulla</h1>
      <RoomCodeBadge roomCode={lobby.roomCode} />

      <div className="w-full max-w-xs">
        <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wide">
          Players {lobby.players.length}/{lobby.maxPlayers}
        </div>
        <ul className="flex flex-col gap-2">
          {lobby.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between bg-felt-800 border border-white/10 rounded-lg px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${p.connected ? "bg-emerald-500" : "bg-neutral-600"}`} />
                {p.displayName}
                {p.isBot && <span className="text-[10px] text-neutral-500">(bot)</span>}
              </span>
              {p.id === lobby.hostPlayerId && (
                <span className="text-[10px] font-semibold text-accent-light uppercase tracking-wide">Host</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {!canStart && <p className="text-sm text-neutral-400 text-center">Waiting for at least 3 players…</p>}

      {isHost ? (
        <button
          disabled={!canStart}
          onClick={startGame}
          className="w-full max-w-xs py-3 rounded-xl bg-accent hover:bg-accent-dark disabled:bg-felt-700 disabled:text-neutral-500 transition-colors font-semibold text-white"
        >
          Start Game
        </button>
      ) : (
        <p className="text-sm text-neutral-400">Waiting for the host to start…</p>
      )}

      <div className="flex gap-4 text-sm">
        <button onClick={() => setScreen("howto")} className="text-neutral-400 hover:text-white underline underline-offset-4">
          How to Play
        </button>
        <button onClick={leaveRoom} className="text-neutral-500 hover:text-red-400">
          Leave room
        </button>
      </div>
    </div>
  );
}
