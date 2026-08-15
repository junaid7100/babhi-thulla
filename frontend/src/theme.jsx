// Shared "backyard" visual theme — palette + small decorative building blocks used
// across the app so the table, lobby, and results screens read as one consistent scene.
//
// Optional art drop-in: if matching image files are placed at these paths under
// frontend/public/assets/, they're layered on top of (and hide) the CSS-gradient
// approximation automatically — no code changes needed. See README "Custom art" section.
export const ASSET = {
  backyardBg: "/assets/backyard-bg.jpg",
  cardBack: "/assets/card-back.png",
  avatar: (slot) => `/assets/avatar-${slot}.png`,
};

export const COLORS = {
  grassLight: "#79c94d",
  grassMid: "#5aad3c",
  grassDark: "#3a7d2c",
  fenceCream: "#f2ead2",
  fenceShadow: "#cfc19a",
  woodLight: "#c98a4d",
  woodMid: "#a86b38",
  woodDark: "#7a4c26",
  badgeYellow: "#ffcf3f",
  badgeYellowDark: "#e0a412",
  gold: "#ffd23f",
  goldDark: "#ff9f1c",
  purple: "#a06bf0",
  purpleDark: "#7c3fd6",
  bronze: "#e0a76b",
  bronzeDark: "#b9793a",
  cream: "#fff8ea",
  creamMuted: "#e9dfc0",
  ink: "#2b2210",
  accent: "#D97757",
  danger: "#e04b3f",
};

export const AVATAR_FRAME_COLORS = ["#4aa3d9", "#e8637a", "#4fbf9f", "#c98a4d", "#9b6bd0", "#e0a412"];

// Simple, distinct emoji faces used as default avatars when no custom art is supplied.
export const AVATAR_EMOJI = ["🧔", "🧑", "👨‍🦱", "👩", "🧑‍🦰", "🧓", "👨‍🦳", "🧑‍🦲"];

export const RIBBONS = {
  1: { label: "1st", sub: "Winner", from: COLORS.gold, to: COLORS.goldDark, text: COLORS.ink },
  2: { label: "2nd", sub: "Winner", from: COLORS.purple, to: COLORS.purpleDark, text: "#fff" },
  3: { label: "3rd", sub: "Winner", from: COLORS.bronze, to: COLORS.bronzeDark, text: COLORS.ink },
};

export const woodPanelStyle = {
  background: `linear-gradient(180deg, ${COLORS.woodLight} 0%, ${COLORS.woodMid} 60%, ${COLORS.woodDark} 100%)`,
  border: "4px solid rgba(255,255,255,0.25)",
  borderRadius: 20,
  boxShadow: "0 14px 34px rgba(0,0,0,0.4), inset 0 2px 6px rgba(255,255,255,0.2)",
  color: COLORS.cream,
  padding: "28px 22px",
};

export const primaryButtonStyle = {
  background: `linear-gradient(180deg, #ffb25a, #e8791f)`,
  color: "#3a2306",
  border: "2px solid rgba(255,255,255,0.6)",
  borderRadius: 12,
  padding: "13px 36px",
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: 0.4,
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
};

export const secondaryButtonStyle = {
  background: "rgba(255,255,255,0.12)",
  color: COLORS.cream,
  border: "1.5px solid rgba(255,255,255,0.4)",
  borderRadius: 12,
  padding: "10px 24px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

export const inputFieldStyle = {
  background: "rgba(255,255,255,0.14)",
  border: "1.5px solid rgba(255,255,255,0.35)",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 15,
  color: COLORS.cream,
  outline: "none",
};

export const tabActiveStyle = {
  flex: 1,
  background: `linear-gradient(180deg, #ffb25a, #e8791f)`,
  color: "#3a2306",
  border: "none",
  borderRadius: 9,
  padding: "10px 0",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

export const tabInactiveStyle = {
  flex: 1,
  background: "rgba(255,255,255,0.10)",
  color: COLORS.creamMuted,
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 9,
  padding: "10px 0",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

export function HamburgerIcon({ size = 20, color = COLORS.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M3 12h18M3 18h18" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function ChatIcon({ size = 20, color = COLORS.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5h16v11H8l-4 4V5z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="9" cy="10.5" r="1" fill={color} />
      <circle cx="12.5" cy="10.5" r="1" fill={color} />
      <circle cx="16" cy="10.5" r="1" fill={color} />
    </svg>
  );
}

export function IconButton({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: COLORS.cream,
        border: "2px solid rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 3px 8px rgba(0,0,0,0.25)",
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Full-bleed backyard scene: grass gradient + picket-fence strip + soft bush blobs.
// Layered so a real photo/illustration dropped at ASSET.backyardBg simply covers this.
export function backyardSceneStyle() {
  return {
    minHeight: "100vh",
    width: "100%",
    backgroundImage: [
      `url(${ASSET.backyardBg})`,
      `radial-gradient(ellipse 420px 260px at 6% 14%, rgba(255,255,255,0.10), transparent 60%)`,
      `radial-gradient(ellipse 460px 300px at 96% 20%, rgba(255,255,255,0.08), transparent 60%)`,
      `radial-gradient(circle at 8% 92%, rgba(255,255,255,0.10), transparent 40%)`,
      `linear-gradient(180deg, ${COLORS.grassLight} 0%, ${COLORS.grassMid} 45%, ${COLORS.grassDark} 100%)`,
    ].join(", "),
    backgroundSize: "cover, cover, cover, cover, cover",
    backgroundPosition: "center, center, center, center, center",
    backgroundRepeat: "no-repeat",
  };
}

export const sceneCss = `
.bt-fence-top {
  position: absolute; top: 0; left: 0; right: 0; height: 34px;
  background:
    repeating-linear-gradient(90deg, ${COLORS.fenceCream} 0 10px, ${COLORS.fenceShadow} 10px 12px, transparent 12px 26px);
  opacity: 0.55;
  pointer-events: none;
}
.bt-wood-table {
  background:
    repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 34px),
    linear-gradient(180deg, ${COLORS.woodLight} 0%, ${COLORS.woodMid} 55%, ${COLORS.woodDark} 100%);
  box-shadow: inset 0 2px 10px rgba(255,255,255,0.15), inset 0 -6px 18px rgba(0,0,0,0.35), 0 10px 30px rgba(0,0,0,0.35);
}
.bt-pop { animation: btPopIn 0.2s ease; }
@keyframes btPopIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes btPulseRing { 0%,100% { box-shadow: 0 0 0 3px rgba(255,210,63,0.9), 0 0 0 7px rgba(255,210,63,0.25); } 50% { box-shadow: 0 0 0 4px rgba(255,210,63,1), 0 0 0 10px rgba(255,210,63,0.35); } }
`;
