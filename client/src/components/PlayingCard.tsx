import React from "react";
import { Card, RED_SUITS, SUIT_SYMBOLS } from "../types";

interface Props {
  card: Card;
  interactive?: boolean;
  legal?: boolean;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "w-9 h-[3.25rem] text-[10px]",
  md: "w-14 h-20 text-sm",
  lg: "w-16 h-24 text-base",
};

export function PlayingCard({ card, interactive = false, legal = true, selected = false, size = "md", onClick, style, className = "" }: Props) {
  const isRed = RED_SUITS.includes(card.suit);
  const dimmed = interactive && !legal;

  return (
    <button
      type="button"
      disabled={!interactive || !legal}
      onClick={onClick}
      aria-label={`${card.rank} of ${card.suit === "S" ? "Spades" : card.suit === "H" ? "Hearts" : card.suit === "D" ? "Diamonds" : "Clubs"}${dimmed ? " (not playable)" : ""}`}
      aria-pressed={selected}
      style={style}
      className={[
        "relative shrink-0 rounded-lg bg-neutral-50 shadow-card font-display select-none",
        "flex flex-col justify-between p-1 transition-transform duration-150",
        SIZE_CLASSES[size],
        isRed ? "text-red-600" : "text-neutral-900",
        interactive && legal ? "cursor-pointer hover:-translate-y-2 active:translate-y-0" : "",
        interactive && !legal ? "opacity-35 saturate-50 cursor-not-allowed" : "",
        selected ? "-translate-y-4 ring-2 ring-accent shadow-card-lifted" : "",
        className,
      ].join(" ")}
    >
      <span className="leading-none font-bold">
        {card.rank}
        <br />
        {SUIT_SYMBOLS[card.suit]}
      </span>
      <span className="self-center text-xl leading-none">{SUIT_SYMBOLS[card.suit]}</span>
      <span className="leading-none font-bold self-end rotate-180">
        {card.rank}
        <br />
        {SUIT_SYMBOLS[card.suit]}
      </span>
    </button>
  );
}

export function CardBack({ size = "md" }: { size?: Props["size"] }) {
  return (
    <div
      className={[
        "shrink-0 rounded-lg shadow-card border-2 border-felt-950",
        "bg-gradient-to-br from-accent-dark via-accent to-accent-dark",
        SIZE_CLASSES[size ?? "md"],
      ].join(" ")}
      aria-hidden="true"
    />
  );
}
