import React, { useState } from "react";
import { useGame } from "../state/GameContext";
import { loadDisplayName, saveDisplayName } from "../session";

export function CreateRoom() {
  const { setScreen, createRoom } = useGame();
  const [displayName, setDisplayName] = useState(loadDisplayName());
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [withBots, setWithBots] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) return;
    saveDisplayName(name);
    createRoom(name, maxPlayers, withBots);
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-10">
      <form onSubmit={submit} className="w-full max-w-xs flex flex-col gap-5">
        <h2 className="font-display text-2xl font-bold text-center">Create a Room</h2>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-neutral-400">Your name</span>
          <input
            autoFocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={16}
            required
            placeholder="e.g. Ahmed"
            className="rounded-lg bg-felt-800 border border-white/10 px-3 py-2.5 text-white placeholder:text-neutral-600 focus:border-accent outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-neutral-400">Max players ({maxPlayers})</span>
          <input
            type="range"
            min={3}
            max={8}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="accent-accent"
          />
        </label>

        <label className="flex items-center justify-between text-sm bg-felt-800 border border-white/10 rounded-lg px-3 py-2.5">
          <span>
            Play with bots
            <span className="block text-xs text-neutral-500">Fill empty seats so you can test/play solo</span>
          </span>
          <input
            type="checkbox"
            checked={withBots}
            onChange={(e) => setWithBots(e.target.checked)}
            className="w-5 h-5 accent-accent"
          />
        </label>

        <button type="submit" className="w-full py-3 rounded-xl bg-accent hover:bg-accent-dark transition-colors font-semibold text-white">
          Create Room
        </button>
        <button type="button" onClick={() => setScreen("home")} className="text-sm text-neutral-400 hover:text-white">
          Back
        </button>
      </form>
    </div>
  );
}
