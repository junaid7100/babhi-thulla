import React, { useState } from "react";
import { useGameState } from "./hooks/useGameState.js";
import Lobby from "./components/Lobby.jsx";
import GameTable from "./components/GameTable.jsx";
import GameOverPanel from "./components/GameOverPanel.jsx";
import { APP_VERSION } from "./version.js";
import {
  COLORS,
  backyardSceneStyle,
  sceneCss,
  woodPanelStyle,
  primaryButtonStyle,
  inputFieldStyle,
  tabActiveStyle,
  tabInactiveStyle,
} from "./theme.jsx";

export default function App() {
  const {
    connected,
    reconnecting,
    roomCode,
    playerId,
    lobby,
    gameState,
    thullaBanner,
    gameFinished,
    errorMessage,
    autoPlayNotice,
    createRoom,
    joinRoom,
    startGame,
    playCard,
    playAgain,
    leaveRoom,
    clearError,
  } = useGameState();

  const isHost = lobby?.hostPlayerId === playerId || gameState?.hostPlayerId === playerId;

  let screen;
  if (reconnecting) {
    screen = (
      <div style={centerBox}>
        <div style={{ color: "#a8a296" }}>Reconnecting…</div>
      </div>
    );
  } else if (!roomCode) {
    screen = <Home connected={connected} onCreate={createRoom} onJoin={joinRoom} />;
  } else if (gameFinished || gameState?.status === "FINISHED") {
    screen = (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <GameOverPanel
          result={
            gameFinished || {
              bhabhiName: gameState.players.find((p) => p.id === gameState.bhabhiPlayerId)?.displayName,
              escapeOrder: gameState.escapeOrder,
              trickCount: gameState.trickCount,
              thullaCount: gameState.thullaCount,
            }
          }
          isHost={isHost}
          roomCode={roomCode}
          onPlayAgain={playAgain}
        />
      </div>
    );
  } else if (gameState?.status === "PLAYING") {
    screen = (
      <GameTable
        gameState={gameState}
        playerId={playerId}
        thullaBanner={thullaBanner}
        autoPlayNotice={autoPlayNotice}
        onPlayCard={playCard}
        onLeave={leaveRoom}
      />
    );
  } else {
    screen = <Lobby lobby={lobby} playerId={playerId} roomCode={roomCode} onStart={startGame} onLeave={leaveRoom} />;
  }

  return (
    <div
      style={{
        ...backyardSceneStyle(),
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        color: COLORS.cream,
        position: "relative",
      }}
    >
      <div className="bt-fence-top" />
      {screen}
      {errorMessage && <ErrorToast message={errorMessage} onDismiss={clearError} />}
      <div
        style={{
          position: "fixed",
          bottom: 4,
          left: 6,
          fontSize: 10,
          color: "rgba(255,255,255,0.45)",
          pointerEvents: "none",
          zIndex: 100,
          letterSpacing: 0.5,
        }}
      >
        {APP_VERSION}
      </div>
      <style>{`
        @keyframes popIn { from { transform: translate(-50%,-50%) scale(0.85); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        html, body { overscroll-behavior-y: none; }
        ${sceneCss}
      `}</style>
    </div>
  );
}

function Home({ connected, onCreate, onJoin }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState("create"); // "create" | "join"
  const [joinCode, setJoinCode] = useState("");
  const [withBots, setWithBots] = useState(true);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === "create") {
      onCreate(name.trim(), 5, withBots);
    } else {
      if (!joinCode.trim()) return;
      onJoin(joinCode.trim().toUpperCase(), name.trim());
    }
  }

  return (
    <div style={centerBox}>
      <div style={{ ...woodPanelStyle, width: "100%", maxWidth: 340 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 800, marginBottom: 10, textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
          🌳 Bhabhi Thulla
        </div>
        <div style={{ color: COLORS.creamMuted, fontSize: 13.5, lineHeight: 1.6, marginBottom: 22 }}>
          Get rid of all your cards. Follow suit — if you can't, you make a Thulla and whoever holds the highest
          lead-suit card takes the whole pile. Last one holding cards is the Bhabhi.
        </div>

        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={20}
            style={inputFieldStyle}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setMode("create")} style={mode === "create" ? tabActiveStyle : tabInactiveStyle}>
              Create Room
            </button>
            <button type="button" onClick={() => setMode("join")} style={mode === "join" ? tabActiveStyle : tabInactiveStyle}>
              Join Room
            </button>
          </div>

          {mode === "join" && (
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={4}
              style={{ ...inputFieldStyle, letterSpacing: 4, textAlign: "center", fontFamily: "Georgia, serif" }}
            />
          )}

          {mode === "create" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setWithBots(true)} style={withBots ? tabActiveStyle : tabInactiveStyle}>
                Play with Bots
              </button>
              <button type="button" onClick={() => setWithBots(false)} style={!withBots ? tabActiveStyle : tabInactiveStyle}>
                Play with Friends
              </button>
            </div>
          )}

          <button type="submit" disabled={!connected} style={{ ...primaryButtonStyle, opacity: connected ? 1 : 0.5 }}>
            {mode === "create" ? "CREATE ROOM" : "JOIN ROOM"}
          </button>
          {!connected && <div style={{ fontSize: 11, color: COLORS.creamMuted }}>Connecting to server…</div>}
        </form>
      </div>
    </div>
  );
}

function ErrorToast({ message, onDismiss }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(181,52,46,0.95)",
        color: "#fff",
        padding: "10px 18px",
        borderRadius: 10,
        fontSize: 13,
        maxWidth: "90%",
        textAlign: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        cursor: "pointer",
        zIndex: 50,
      }}
      onClick={onDismiss}
    >
      {message}
    </div>
  );
}

const centerBox = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  textAlign: "center",
};
