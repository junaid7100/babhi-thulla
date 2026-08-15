import React, { useState } from "react";
import { COLORS, woodPanelStyle, primaryButtonStyle, secondaryButtonStyle } from "../theme.jsx";

export default function Lobby({ lobby, playerId, roomCode, onStart, onLeave }) {
  const [copied, setCopied] = useState(false);
  if (!lobby) {
    return (
      <div style={centerBox}>
        <div style={{ color: COLORS.cream }}>Loading room…</div>
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
      <div style={{ ...woodPanelStyle, width: "100%", maxWidth: 340 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, color: COLORS.creamMuted, marginBottom: 6 }}>ROOM CODE</div>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: 6,
            color: COLORS.gold,
            marginBottom: 12,
            textShadow: "0 2px 4px rgba(0,0,0,0.4)",
          }}
        >
          {roomCode}
        </div>
        <button onClick={copyCode} style={secondaryButtonStyle}>
          {copied ? "Copied!" : "Copy Room Code"}
        </button>

        <div style={{ marginTop: 26, width: "100%" }}>
          <div style={{ fontSize: 12, letterSpacing: 1, color: COLORS.creamMuted, marginBottom: 10, textAlign: "center" }}>
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
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 10,
                  padding: "10px 14px",
                }}
              >
                <span style={{ fontWeight: p.id === playerId ? 700 : 400 }}>
                  {p.displayName} {p.id === playerId ? "(you)" : ""} {p.id === lobby.hostPlayerId ? "★" : ""}
                </span>
                {p.isBot ? (
                  <span style={{ fontSize: 10, color: COLORS.creamMuted }}>BOT</span>
                ) : (
                  !p.connected && <span style={{ fontSize: 10, color: COLORS.danger }}>offline</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {!canStart && (
          <div style={{ fontSize: 12.5, color: COLORS.creamMuted, marginTop: 20 }}>Waiting for at least 3 players…</div>
        )}

        {isHost ? (
          <button onClick={() => onStart()} disabled={!canStart} style={{ ...primaryButtonStyle, marginTop: 22, opacity: canStart ? 1 : 0.4 }}>
            START GAME
          </button>
        ) : (
          <div style={{ fontSize: 12.5, color: COLORS.creamMuted, marginTop: 22 }}>Waiting for host to start…</div>
        )}

        <button onClick={onLeave} style={{ ...linkButton, marginTop: 16 }}>
          Leave room
        </button>
      </div>
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

const linkButton = {
  background: "transparent",
  color: COLORS.creamMuted,
  border: "none",
  fontSize: 12,
  textDecoration: "underline",
  cursor: "pointer",
};

export { centerBox };
