import React from "react";
import { SUIT_SYMBOL } from "../constants.js";
import { ASSET, COLORS } from "../theme.jsx";

const SIZES = {
  xs: { w: 22, h: 32, font: 9, suitFont: 10 },
  sm: { w: 34, h: 48, font: 13, suitFont: 14 },
  md: { w: 52, h: 74, font: 18, suitFont: 20 },
  lg: { w: 60, h: 86, font: 20, suitFont: 24 },
};

export function CardBack({ size = "sm", rotate = 0 }) {
  const s = SIZES[size];
  return (
    <div
      style={{
        width: s.w,
        height: s.h,
        borderRadius: 6,
        border: "2px solid rgba(255,255,255,0.85)",
        backgroundImage: [
          `url(${ASSET.cardBack})`,
          `repeating-linear-gradient(45deg, rgba(255,255,255,0.10) 0 4px, transparent 4px 8px)`,
          `linear-gradient(155deg, #2d3a8c 0%, #1c2560 100%)`,
        ].join(", "),
        backgroundSize: "cover, cover, cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 5px rgba(0,0,0,0.35)",
        transform: `rotate(${rotate}deg)`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: "62%",
          height: "42%",
          borderRadius: 999,
          background: "rgba(255,255,255,0.16)",
          border: "1px solid rgba(255,255,255,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.max(7, s.font * 0.5),
          fontWeight: 800,
          color: "#fff",
          letterSpacing: 0.5,
        }}
      >
        BT
      </div>
    </div>
  );
}

export default function PlayingCard({ card, size = "md", faded = false, onClick, disabled, selected }) {
  const isRed = card.suit === "H" || card.suit === "D";
  const s = SIZES[size];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: s.w,
        height: s.h,
        background: faded ? "#e8e4da" : "#fdfcf8",
        borderRadius: 8,
        border: selected ? `2.5px solid ${COLORS.accent}` : "1px solid rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "4px 5px",
        boxShadow: selected ? `0 6px 14px rgba(217,119,87,0.4)` : "0 2px 4px rgba(0,0,0,0.25)",
        cursor: disabled ? "default" : "pointer",
        opacity: faded ? 0.4 : 1,
        transform: selected ? "translateY(-10px)" : "translateY(0)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: s.font,
          fontWeight: 700,
          color: isRed ? "#B5342E" : "#1a1a1a",
          lineHeight: 1,
          textAlign: "left",
          fontFamily: "Georgia, serif",
        }}
      >
        {card.rank}
      </div>
      <div
        style={{
          fontSize: s.suitFont,
          color: isRed ? "#B5342E" : "#1a1a1a",
          textAlign: "right",
          lineHeight: 1,
        }}
      >
        {SUIT_SYMBOL[card.suit]}
      </div>
    </button>
  );
}
