import React from "react";
import { useGame } from "../state/GameContext";

export function Home() {
  const { setScreen, expiredMessage } = useGame();

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 gap-8 text-center">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-wide">
          Bhabhi <span className="text-accent">Thulla</span>
        </h1>
        <p className="mt-2 text-neutral-400 text-sm max-w-xs mx-auto">
          The classic shedding card game. Follow suit, avoid the pile, and don't be the last one holding cards.
        </p>
      </div>

      {expiredMessage && (
        <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2 max-w-xs">
          {expiredMessage}
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          className="w-full py-3 rounded-xl bg-accent hover:bg-accent-dark transition-colors font-semibold text-white shadow-card"
          onClick={() => setScreen("create")}
        >
          Create Room
        </button>
        <button
          className="w-full py-3 rounded-xl bg-felt-800 hover:bg-felt-700 transition-colors font-semibold border border-white/10"
          onClick={() => setScreen("join")}
        >
          Join Room
        </button>
        <button
          className="w-full py-2.5 rounded-xl text-neutral-300 hover:text-white text-sm underline underline-offset-4"
          onClick={() => setScreen("howto")}
        >
          How to Play
        </button>
        <button
          className="w-full py-2 rounded-xl text-neutral-500 hover:text-neutral-300 text-xs"
          onClick={() => setScreen("settings")}
        >
          Settings
        </button>
      </div>
    </div>
  );
}
