import React, { useState } from "react";
import { useGame } from "../state/GameContext";
import { loadDisplayName, saveDisplayName } from "../session";

export function JoinRoom() {
  const { setScreen, joinRoom } = useGame();
  const [displayName, setDisplayName] = useState(loadDisplayName());
  const [roomCode, setRoomCode] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = displayName.trim();
    const code = roomCode.trim().toUpperCase();
    if (!name || !code) return;
    saveDisplayName(name);
    joinRoom(code, name);
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-10">
      <form onSubmit={submit} className="w-full max-w-xs flex flex-col gap-5">
        <h2 className="font-display text-2xl font-bold text-center">Join a Room</h2>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-neutral-400">Room code</span>
          <input
            autoFocus
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={4}
            required
            placeholder="K7PX"
            className="rounded-lg bg-felt-800 border border-white/10 px-3 py-2.5 text-white tracking-[0.3em] font-display text-xl text-center placeholder:text-neutral-600 focus:border-accent outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-neutral-400">Your name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={16}
            required
            placeholder="e.g. Bilal"
            className="rounded-lg bg-felt-800 border border-white/10 px-3 py-2.5 text-white placeholder:text-neutral-600 focus:border-accent outline-none"
          />
        </label>

        <button type="submit" className="w-full py-3 rounded-xl bg-accent hover:bg-accent-dark transition-colors font-semibold text-white">
          Join Room
        </button>
        <button type="button" onClick={() => setScreen("home")} className="text-sm text-neutral-400 hover:text-white">
          Back
        </button>
      </form>
    </div>
  );
}
