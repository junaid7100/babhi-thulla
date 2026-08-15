import React, { useEffect, useState } from "react";
import { useGame } from "./state/GameContext";
import { Home } from "./screens/Home";
import { CreateRoom } from "./screens/CreateRoom";
import { JoinRoom } from "./screens/JoinRoom";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";
import { Results } from "./screens/Results";
import { HowToPlay } from "./screens/HowToPlay";
import { Settings } from "./screens/Settings";

export default function App() {
  const { connectionStatus, screen, error, dismissError, settings, updateSettings } = useGame();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (screen === "game" && !settings.onboardingSeen) {
      setShowOnboarding(true);
      updateSettings({ onboardingSeen: true });
    }
  }, [screen, settings.onboardingSeen, updateSettings]);

  return (
    <div className="min-h-screen flex flex-col">
      {connectionStatus !== "connected" && (
        <div
          role="status"
          className="fixed top-0 inset-x-0 z-50 bg-amber-700 text-white text-center text-xs py-1.5"
        >
          {connectionStatus === "connecting" ? "Connecting…" : "Connection lost — reconnecting…"}
        </div>
      )}

      <main className="flex-1">
        {screen === "home" && <Home />}
        {screen === "create" && <CreateRoom />}
        {screen === "join" && <JoinRoom />}
        {screen === "lobby" && <Lobby />}
        {screen === "game" && <Game />}
        {screen === "results" && <Results />}
        {screen === "howto" && <HowToPlay />}
        {screen === "settings" && <Settings />}
      </main>

      {error && (
        <div
          role="alertdialog"
          aria-live="assertive"
          className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
        >
          <div className="bg-red-900 border border-red-700 text-white text-sm rounded-xl px-4 py-3 shadow-card-lifted flex items-center gap-3 max-w-sm">
            <span>{error}</span>
            <button onClick={dismissError} className="text-red-300 hover:text-white font-bold" aria-label="Dismiss">
              ✕
            </button>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-6">
          <div className="bg-felt-800 border border-white/10 rounded-2xl p-6 max-w-sm text-sm leading-relaxed space-y-2">
            <p>Get rid of all your cards.</p>
            <p>Follow the suit that was led.</p>
            <p>If you don't have that suit, playing another suit makes a THULLA.</p>
            <p>The highest card of the led suit takes the pile.</p>
            <p className="font-semibold text-accent-light">The last player left is the BHABHI.</p>
            <button
              onClick={() => setShowOnboarding(false)}
              className="mt-3 w-full py-2.5 rounded-xl bg-accent hover:bg-accent-dark font-semibold text-white"
            >
              Let's play
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
