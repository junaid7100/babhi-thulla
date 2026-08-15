import React, { useState } from "react";
import { COLORS, woodPanelStyle, primaryButtonStyle, secondaryButtonStyle, RIBBONS } from "../theme.jsx";

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
    <div style={{ ...woodPanelStyle, maxWidth: 320, margin: "0 auto" }}>
      <div style={{ fontSize: 11, letterSpacing: 2, color: COLORS.creamMuted, marginBottom: 8 }}>GAME OVER</div>
      <div style={{ fontSize: 12, color: COLORS.creamMuted, marginBottom: 2 }}>Bhabhi</div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 800, color: "#ff8a7a", marginBottom: 14 }}>
        {bhabhiName}
      </div>
      <div style={{ fontSize: 12, color: COLORS.creamMuted, marginBottom: 8 }}>Finish order</div>
      <div style={{ fontSize: 13.5, marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        {escapeOrder.map((e, i) => {
          const rank = i + 1;
          const ribbon = RIBBONS[rank];
          return (
            <div
              key={e.playerId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {ribbon ? (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: `linear-gradient(180deg, ${ribbon.from}, ${ribbon.to})`,
                    color: ribbon.text,
                  }}
                >
                  {ribbon.label}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: COLORS.creamMuted, width: 30 }}>{rank}.</span>
              )}
              <span>{e.displayName}</span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          fontSize: 11.5,
          color: COLORS.creamMuted,
          marginBottom: 18,
          borderTop: "1px solid rgba(255,255,255,0.2)",
          paddingTop: 12,
        }}
      >
        <span>{trickCount} tricks</span>
        <span>{thullaCount} thullas</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isHost && (
          <button onClick={onPlayAgain} style={primaryButtonStyle}>
            PLAY AGAIN
          </button>
        )}
        <button onClick={copyCode} style={secondaryButtonStyle}>
          {copied ? "Copied!" : `Copy Room Code (${roomCode})`}
        </button>
        {!isHost && <div style={{ fontSize: 11.5, color: COLORS.creamMuted }}>Waiting for host to start a new game…</div>}
      </div>
    </div>
  );
}
