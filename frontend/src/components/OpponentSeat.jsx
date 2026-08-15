import React from "react";
import { CardBack } from "./PlayingCard.jsx";
import { AVATAR_FRAME_COLORS, AVATAR_EMOJI, RIBBONS, COLORS, ASSET } from "../theme.jsx";

// side: "top" | "left" | "right" | "bottom" — flips which side the card-back fan sits on
// so it always reads as "reaching in" from outside the table toward center.
export default function OpponentSeat({ player, colorIndex, side = "top" }) {
  const { displayName, cardCount, isCurrentTurn, escaped, escapedAt, connected, isBot } = player;
  const frameColor = AVATAR_FRAME_COLORS[colorIndex % AVATAR_FRAME_COLORS.length];
  const emoji = AVATAR_EMOJI[colorIndex % AVATAR_EMOJI.length];
  const ribbon = escaped && escapedAt && RIBBONS[escapedAt] ? RIBBONS[escapedAt] : null;
  const fanOnRight = side === "left" || side === "top";

  const avatarBlock = (
    <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
      {ribbon && (
        <div
          style={{
            position: "absolute",
            top: -16,
            left: "50%",
            transform: "translateX(-50%) rotate(-6deg)",
            background: `linear-gradient(180deg, ${ribbon.from}, ${ribbon.to})`,
            color: ribbon.text,
            fontSize: 9,
            fontWeight: 800,
            lineHeight: 1.05,
            padding: "3px 7px 4px",
            borderRadius: 5,
            border: "1.5px solid rgba(255,255,255,0.8)",
            boxShadow: "0 3px 6px rgba(0,0,0,0.35)",
            textAlign: "center",
            whiteSpace: "nowrap",
            zIndex: 3,
          }}
        >
          {ribbon.label}
          <div style={{ fontSize: 7, fontWeight: 700 }}>{ribbon.sub}</div>
        </div>
      )}
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 14,
          background: `${frameColor}22`,
          backgroundImage: [`url(${ASSET.avatar(colorIndex)})`, `linear-gradient(160deg, ${frameColor}, ${frameColor}bb)`].join(", "),
          backgroundSize: "cover, cover",
          backgroundPosition: "center",
          border: `3px solid ${isCurrentTurn ? COLORS.gold : "#fff"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          boxShadow: isCurrentTurn
            ? "0 0 0 3px rgba(255,210,63,0.55), 0 4px 10px rgba(0,0,0,0.35)"
            : "0 4px 10px rgba(0,0,0,0.35)",
          animation: isCurrentTurn ? "btPulseRing 1.1s ease-in-out infinite" : "none",
          opacity: escaped ? 0.55 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        {emoji}
      </div>
      {!escaped && (
        <div
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            minWidth: 22,
            height: 22,
            padding: "0 5px",
            borderRadius: 999,
            background: `linear-gradient(180deg, ${COLORS.badgeYellow}, ${COLORS.badgeYellowDark})`,
            border: "2px solid #fff",
            color: COLORS.ink,
            fontSize: 11,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          {cardCount}
        </div>
      )}
      {!connected && (
        <div
          style={{
            position: "absolute",
            bottom: -3,
            left: -3,
            width: 13,
            height: 13,
            borderRadius: "50%",
            background: COLORS.danger,
            border: "2px solid #fff",
          }}
          title="Disconnected"
        />
      )}
    </div>
  );

  const cardFan = !escaped && cardCount > 0 && (
    <div style={{ display: "flex", marginLeft: fanOnRight ? -6 : 0, marginRight: fanOnRight ? 0 : -6 }}>
      <CardBack size="xs" rotate={fanOnRight ? -8 : 8} />
      <div style={{ marginLeft: -14 }}>
        <CardBack size="xs" rotate={fanOnRight ? 8 : -8} />
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 64 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {!fanOnRight && cardFan}
        {avatarBlock}
        {fanOnRight && cardFan}
      </div>
      <div
        style={{
          marginTop: 6,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 10px",
          borderRadius: 999,
          maxWidth: 96,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {displayName}
        {isBot && " 🤖"}
      </div>
      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.85)", marginTop: 2, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
        {escaped ? `Escaped #${escapedAt}` : `${cardCount} cards`}
      </div>
    </div>
  );
}
