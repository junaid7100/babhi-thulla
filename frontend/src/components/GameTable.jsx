import React, { useEffect, useRef, useState } from "react";
import PlayingCard from "./PlayingCard.jsx";
import OpponentSeat from "./OpponentSeat.jsx";
import ThullaBanner from "./ThullaBanner.jsx";
import { SUIT_SYMBOL, SUIT_NAME } from "../constants.js";

function getLegalCardIds(hand, leadSuit, mustLeadAceOfSpades) {
  if (mustLeadAceOfSpades) {
    return hand.some((c) => c.id === "AS") ? ["AS"] : hand.map((c) => c.id);
  }
  if (!leadSuit) return hand.map((c) => c.id);
  const followers = hand.filter((c) => c.suit === leadSuit);
  if (followers.length > 0) return followers.map((c) => c.id);
  return hand.map((c) => c.id);
}

export default function GameTable({ gameState, playerId, thullaBanner, onPlayCard }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [shownTrick, setShownTrick] = useState([]);
  const prevTrickRef = useRef([]);
  const holdTimeoutRef = useRef(null);

  const currentTrick = gameState?.currentTrick || [];
  const trickCount = gameState?.trickCount ?? 0;

  useEffect(() => {
    const prevTrick = prevTrickRef.current;
    if (currentTrick.length > 0) {
      setShownTrick(currentTrick);
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
    } else if (prevTrick.length > 0) {
      setShownTrick(prevTrick);
      const delay = thullaBanner ? 1500 : 500;
      holdTimeoutRef.current = setTimeout(() => setShownTrick([]), delay);
    } else {
      setShownTrick([]);
    }
    prevTrickRef.current = currentTrick;
    return () => {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrick.length, trickCount]);

  useEffect(() => {
    setSelectedCard(null);
  }, [gameState?.currentPlayerId]);

  if (!gameState) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#a8a296" }}>
        Loading game…
      </div>
    );
  }

  const me = gameState.players.find((p) => p.id === playerId);
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const myHand = gameState.you?.hand || [];
  const isMyTurn = gameState.status === "PLAYING" && gameState.currentPlayerId === playerId && !thullaBanner;
  const currentLeadSuit = shownTrick.length > 0 ? shownTrick[0].card.suit : null;
  const mustLeadAceOfSpades = gameState.firstTrick && currentTrick.length === 0;
  const legalForMe = isMyTurn ? getLegalCardIds(myHand, gameState.leadSuit, mustLeadAceOfSpades) : [];
  const currentPlayerName = gameState.players.find((p) => p.id === gameState.currentPlayerId)?.displayName;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          background: "rgba(0,0,0,0.25)",
          fontSize: 12,
          letterSpacing: 0.5,
          flexShrink: 0,
        }}
      >
        <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: "#D97757", fontWeight: 700 }}>
          BHABHI THULLA
        </div>
        <div style={{ display: "flex", gap: 12, color: "#a8a296" }}>
          <span>Trick {gameState.trickCount}</span>
          <span>·</span>
          <span>Thullas {gameState.thullaCount}</span>
        </div>
      </div>

      {/* Opponents row */}
      <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", padding: "12px 8px", flexShrink: 0 }}>
        {opponents.map((p, i) => (
          <OpponentSeat key={p.id} player={p} colorIndex={i} />
        ))}
      </div>

      {/* Center table */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          minHeight: 160,
        }}
      >
        {currentLeadSuit && (
          <div style={{ fontSize: 11, color: "#a8a296", marginBottom: 8, letterSpacing: 1 }}>
            LEAD SUIT:{" "}
            <span style={{ color: currentLeadSuit === "H" || currentLeadSuit === "D" ? "#e8837a" : "#f0ede4" }}>
              {SUIT_SYMBOL[currentLeadSuit]} {SUIT_NAME[currentLeadSuit]}
            </span>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", minHeight: 74 }}>
          {shownTrick.map((t) => (
            <div key={t.playerId} style={{ textAlign: "center" }}>
              <PlayingCard card={t.card} size="md" />
              <div style={{ fontSize: 10, color: "#a8a296", marginTop: 4 }}>{t.displayName}</div>
            </div>
          ))}
        </div>
        {shownTrick.length === 0 && !thullaBanner && (
          <div style={{ fontSize: 12, color: "#6b6558" }}>
            {gameState.firstTrick ? "Waiting for A♠ to lead…" : `Waiting for ${currentPlayerName || "next player"}…`}
          </div>
        )}

        <ThullaBanner banner={thullaBanner} />
      </div>

      {/* My hand */}
      <div style={{ flexShrink: 0, padding: "10px 8px 18px" }}>
        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            marginBottom: 8,
            color: isMyTurn ? "#D97757" : "#6b6558",
          }}
        >
          {me?.escaped ? "YOU ESCAPED" : isMyTurn ? "YOUR TURN" : `${currentPlayerName || "…"}'s turn`}
        </div>
        <div
          data-testid="my-hand"
          style={{
            display: "flex",
            justifyContent: myHand.length > 8 ? "flex-start" : "center",
            gap: 0,
            overflowX: "auto",
            padding: "6px 4px 4px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {myHand.map((card) => {
            const legal = legalForMe.includes(card.id);
            return (
              <div key={card.id} style={{ marginLeft: -12 }}>
                <PlayingCard
                  card={card}
                  size="md"
                  faded={isMyTurn && !legal}
                  disabled={!isMyTurn || !legal}
                  selected={selectedCard === card.id}
                  onClick={() => {
                    if (!isMyTurn || !legal) return;
                    if (selectedCard === card.id) {
                      onPlayCard(card.id);
                      setSelectedCard(null);
                    } else {
                      setSelectedCard(card.id);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
        {selectedCard && (
          <div style={{ textAlign: "center", fontSize: 11, color: "#a8a296", marginTop: 6 }}>Tap again to play</div>
        )}
      </div>
    </div>
  );
}
