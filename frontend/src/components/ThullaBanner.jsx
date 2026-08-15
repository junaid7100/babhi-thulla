import React from "react";
import { SUIT_NAME } from "../constants.js";

export default function ThullaBanner({ banner }) {
  if (!banner) return null;
  const { offenderName, offenderSuitMissing, winnerName, pileSize } = banner;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        background: "rgba(181,52,46,0.95)",
        border: "1px solid #e8837a",
        borderRadius: 12,
        padding: "14px 22px",
        textAlign: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        animation: "popIn 0.25s ease",
        maxWidth: "88%",
        width: 300,
        zIndex: 20,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1, fontFamily: "Georgia, serif" }}>THULLA!</div>
      <div style={{ fontSize: 12.5, marginTop: 4, color: "#f0ede4dd" }}>
        {offenderName} had no {SUIT_NAME[offenderSuitMissing]} — {winnerName} takes the pile ({pileSize} cards)
      </div>
    </div>
  );
}
