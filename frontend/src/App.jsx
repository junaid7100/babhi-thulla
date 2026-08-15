import React, { useState } from "react";
import { useGameState } from "./hooks/useGameState.js";
import Lobby from "./components/Lobby.jsx";
import GameTable from "./components/GameTable.jsx";
import GameOverPanel from "./components/GameOverPanel.jsx";

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
    screen = <GameTable gameState={gameState} playerId={playerId} thullaBanner={thullaBanner} onPlayCard={playCard} />;
  } else {
    screen = <Lobby lobby={lobby} playerId={playerId} roomCode={roomCode} onStart={startGame} onLeave={leaveRoom} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at center, #1a3a2e 0%, #0d1f18 70%, #08130e 100%)",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        color: "#f0ede4",
      }}
    >
      {screen}
      {errorMessage && <ErrorToast message={errorMessage} onDismiss={clearError} />}
      <style>{`
        @keyframes popIn { from { transform: translate(-50%,-50%) scale(0.85); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        html, body { overscroll-behavior-y: none; }
      `}</style>
    </div>
  );
}

function Home({ connected, onCreate, onJoin }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState("create"); // "create" | "join"
  const [joinCode, setJoinCode] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === "create") {
      onCreate(name.trim(), 5);
    } else {
      if (!joinCode.trim()) return;
      onJoin(joinCode.trim().toUpperCase(), name.trim());
    }
  }

  return (
    <div style={centerBox}>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 800, marginBottom: 10 }}>
        Bhabhi Thulla
      </div>
      <div style={{ color: "#a8a296", fontSize: 14, maxWidth: 320, lineHeight: 1.6, marginBottom: 24 }}>
        Get rid of all your cards. Follow suit — if you can't, you make a Thulla and whoever holds the highest
        lead-suit card takes the whole pile. Last one holding cards is the Bhabhi.
      </div>

      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          style={inputStyle}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setMode("create")} style={mode === "create" ? tabActive : tabInactive}>
            Create Room
          </button>
          <button type="button" onClick={() => setMode("join")} style={mode === "join" ? tabActive : tabInactive}>
            Join Room
          </button>
        </div>

        {mode === "join" && (
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Room code"
            maxLength={4}
            style={{ ...inputStyle, letterSpacing: 4, textAlign: "center", fontFamily: "Georgia, serif" }}
          />
        )}

        <button type="submit" disabled={!connected} style={{ ...primaryButton, opacity: connected ? 1 : 0.5 }}>
          {mode === "create" ? "CREATE ROOM" : "JOIN ROOM"}
        </button>
        {!connected && <div style={{ fontSize: 11, color: "#a8a296" }}>Connecting to server…</div>}
      </form>
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

const primaryButton = {
  background: "#D97757",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "14px 40px",
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: 0.5,
  cursor: "pointer",
  boxShadow: "0 6px 20px rgba(217,119,87,0.35)",
};

const inputStyle = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 15,
  color: "#f0ede4",
  outline: "none",
};

const tabActive = {
  flex: 1,
  background: "#D97757",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 0",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const tabInactive = {
  flex: 1,
  background: "rgba(255,255,255,0.06)",
  color: "#a8a296",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "10px 0",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
