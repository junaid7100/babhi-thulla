import React, { useState } from "react";

export default function GameOverPanel({ result, isHost, roomCode, onPlayAgain }) {
  const [copied, setCopied] = useState(false);
  if (!result) return null;
  const { bhabhiName, escapeOrder, trickCount, thullaCount } = result;

  function copyCode() {
    navigator.clipboard?.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: "24px 20px",
        textAlign: "center",
        maxWidth: 320,
        margin: "0 auto",
        backdropFilter: "blur(4px)",
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 2, color: "#a8a296", marginBottom: 8 }}>GAME OVER</div>
      <div style={{ fontSize: 12, color: "#a8a296", marginBottom: 2 }}>Bhabhi</div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 800, color: "#e8837a", marginBottom: 14 }}>
        {bhabhiName}
      </div>
      <div style={{ fontSize: 12, color: "#a8a296", marginBottom: 6 }}>Escaped</div>
      <div style={{ fontSize: 13.5, marginBottom: 14, lineHeight: 1.7 }}>
        {escapeOrder.map((e, i) => (
          <div key={e.playerId}>
            {i + 1}. {e.displayName}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          fontSize: 11.5,
          color: "#a8a296",
          marginBottom: 18,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 12,
        }}
      >
        <span>{trickCount} tricks</span>
        <span>{thullaCount} thullas</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isHost && (
          <button
            onClick={onPlayAgain}
            style={{
              background: "#D97757",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 32px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            PLAY AGAIN
          </button>
        )}
        <button
          onClick={copyCode}
          style={{
            background: "transparent",
            color: "#f0ede4",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 10,
            padding: "10px 32px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied!" : `Copy Room Code (${roomCode})`}
        </button>
        {!isHost && (
          <div style={{ fontSize: 11.5, color: "#a8a296" }}>Waiting for host to start a new game…</div>
        )}
      </div>
    </div>
  );
}
