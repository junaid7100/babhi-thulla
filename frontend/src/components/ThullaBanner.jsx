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
        background: "linear-gradient(180deg, #ff6b57, #d33a2c)",
        border: "2px solid rgba(255,255,255,0.85)",
        borderRadius: 14,
        padding: "14px 22px",
        textAlign: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        animation: "popIn 0.25s ease",
        maxWidth: "88%",
        width: 280,
        zIndex: 20,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1, fontFamily: "Georgia, serif", color: "#fff" }}>
        THULLA!
      </div>
      <div style={{ fontSize: 12.5, marginTop: 4, color: "#fff" }}>
        {offenderName} had no {SUIT_NAME[offenderSuitMissing]} — {winnerName} takes the pile ({pileSize} cards)
      </div>
    </div>
  );
}
