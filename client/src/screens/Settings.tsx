import React from "react";
import { useGame } from "../state/GameContext";

export function Settings() {
  const { setScreen, settings, updateSettings, leaveRoom, lobby, state } = useGame();
  const inGame = Boolean(lobby || state);

  return (
    <div className="min-h-full flex flex-col items-center px-6 py-10 gap-6">
      <h1 className="font-display text-2xl font-bold">Settings</h1>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <label className="flex items-center justify-between bg-felt-800 border border-white/10 rounded-lg px-3 py-3">
          <span className="text-sm">Sound effects</span>
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(e) => updateSettings({ sound: e.target.checked })}
            className="w-5 h-5 accent-accent"
          />
        </label>

        <label className="flex items-center justify-between bg-felt-800 border border-white/10 rounded-lg px-3 py-3">
          <span className="text-sm">Faster animations</span>
          <input
            type="checkbox"
            checked={settings.animationSpeed === "fast"}
            onChange={(e) => updateSettings({ animationSpeed: e.target.checked ? "fast" : "normal" })}
            className="w-5 h-5 accent-accent"
          />
        </label>

        <button
          onClick={() => setScreen("howto")}
          className="w-full py-3 rounded-xl bg-felt-800 hover:bg-felt-700 border border-white/10 font-semibold text-left px-4"
        >
          Rules
        </button>

        {inGame && (
          <button onClick={leaveRoom} className="w-full py-3 rounded-xl bg-red-900/60 hover:bg-red-900 border border-red-800/50 font-semibold">
            Leave game
          </button>
        )}
      </div>

      <button onClick={() => setScreen(inGame ? (state ? "game" : "lobby") : "home")} className="text-sm text-neutral-400 hover:text-white">
        Back
      </button>
    </div>
  );
}
