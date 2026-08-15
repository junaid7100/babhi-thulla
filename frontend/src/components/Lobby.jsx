import React, { useState } from "react";

export default function Lobby({ lobby, playerId, roomCode, onStart, onLeave }) {
  const [copied, setCopied] = useState(false);
  if (!lobby) {
    return (
      <div style={centerBox}>
        <div style={{ color: "#a8a296" }}>Loading room…</div>
      </div>
    );
  }

  const isHost = lobby.hostPlayerId === playerId;
  const canStart = lobby.players.length >= 3;

  function copyCode() {
    navigator.clipboard?.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div style={centerBox}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: "#a8a296", marginBottom: 6 }}>ROOM CODE</div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: 6,
          color: "#D97757",
          marginBottom: 12,
        }}
      >
        {roomCode}
      </div>
      <button onClick={copyCode} style={secondaryButton}>
        {copied ? "Copied!" : "Copy Room Code"}
      </button>

      <div style={{ marginTop: 30, width: "100%", maxWidth: 320 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, color: "#a8a296", marginBottom: 10, textAlign: "center" }}>
          PLAYERS ({lobby.players.length}/{lobby.maxPlayers})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lobby.players.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <span style={{ fontWeight: p.id === playerId ? 700 : 400 }}>
                {p.displayName} {p.id === playerId ? "(you)" : ""} {p.id === lobby.hostPlayerId ? "★" : ""}
              </span>
              {p.isBot ? (
                <span style={{ fontSize: 10, color: "#a8a296" }}>BOT</span>
              ) : (
                !p.connected && <span style={{ fontSize: 10, color: "#B5342E" }}>offline</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {!canStart && (
        <div style={{ fontSize: 12.5, color: "#a8a296", marginTop: 20 }}>Waiting for at least 3 players…</div>
      )}

      {isHost ? (
        <button onClick={onStart} disabled={!canStart} style={{ ...primaryButton, marginTop: 24, opacity: canStart ? 1 : 0.4 }}>
          START GAME
        </button>
      ) : (
        <div style={{ fontSize: 12.5, color: "#a8a296", marginTop: 24 }}>Waiting for host to start…</div>
      )}

      <button onClick={onLeave} style={{ ...linkButton, marginTop: 18 }}>
        Leave room
      </button>
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

const secondaryButton = {
  background: "transparent",
  color: "#f0ede4",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 10,
  padding: "10px 24px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const linkButton = {
  background: "transparent",
  color: "#a8a296",
  border: "none",
  fontSize: 12,
  textDecoration: "underline",
  cursor: "pointer",
};

export { centerBox, primaryButton, secondaryButton, linkButton };
