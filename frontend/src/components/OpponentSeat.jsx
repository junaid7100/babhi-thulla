import React from "react";
import { AVATAR_COLORS } from "../constants.js";

export default function OpponentSeat({ player, colorIndex }) {
  const { displayName, cardCount, isCurrentTurn, escaped, escapedAt, connected } = player;
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  return (
    <div style={{ textAlign: "center", opacity: escaped ? 0.45 : 1, minWidth: 56 }}>
      <div style={{ position: "relative", width: 40, height: 40, margin: "0 auto" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 15,
            border: isCurrentTurn ? "2.5px solid #D97757" : "2px solid transparent",
            boxShadow: isCurrentTurn ? "0 0 0 4px rgba(217,119,87,0.25)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          {displayName ? displayName[0].toUpperCase() : "?"}
        </div>
        {!connected && (
          <div
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#B5342E",
              border: "2px solid #0d1f18",
            }}
            title="Disconnected"
          />
        )}
      </div>
      <div style={{ fontSize: 11, marginTop: 4, fontWeight: isCurrentTurn ? 700 : 400 }}>{displayName}</div>
      <div style={{ fontSize: 10, color: "#a8a296" }}>
        {escaped ? `Escaped #${escapedAt}` : `${cardCount} cards`}
      </div>
    </div>
  );
}
