import React, { useEffect, useRef, useState } from "react";
import PlayingCard, { CardBack } from "./PlayingCard.jsx";
import OpponentSeat from "./OpponentSeat.jsx";
import ThullaBanner from "./ThullaBanner.jsx";
import { SUIT_SYMBOL, SUIT_NAME } from "../constants.js";
import { COLORS, HamburgerIcon, ChatIcon, IconButton, RIBBONS } from "../theme.jsx";

function getLegalCardIds(hand, leadSuit, mustLeadAceOfSpades) {
  if (mustLeadAceOfSpades) {
    return hand.some((c) => c.id === "AS") ? ["AS"] : hand.map((c) => c.id);
  }
  if (!leadSuit) return hand.map((c) => c.id);
  const followers = hand.filter((c) => c.suit === leadSuit);
  if (followers.length > 0) return followers.map((c) => c.id);
  return hand.map((c) => c.id);
}

// Assigns up to 4 opponents to fixed seats around the table (matches a real backyard
// card-table layout: one across from you, one on each side, one more tucked bottom-left).
const SEAT_ORDER_BY_COUNT = {
  1: ["top"],
  2: ["left", "right"],
  3: ["top", "left", "right"],
  4: ["top", "left", "right", "bottomLeft"],
};
function assignSeats(opponents) {
  const order = SEAT_ORDER_BY_COUNT[opponents.length] || ["top", "left", "right", "bottomLeft"];
  const seats = {};
  opponents.forEach((p, i) => {
    seats[order[i] || "bottomLeft"] = p;
  });
  return seats;
}

export default function GameTable({ gameState, playerId, thullaBanner, autoPlayNotice, onPlayCard, onLeave }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [shownTrick, setShownTrick] = useState([]);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const prevTrickRef = useRef([]);
  const holdTimeoutRef = useRef(null);

  const currentTrick = gameState?.currentTrick || [];
  const trickCount = gameState?.trickCount ?? 0;
  const turnDeadline = gameState?.turnDeadline ?? null;

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

  useEffect(() => {
    if (!turnDeadline) {
      setRemainingSeconds(null);
      return;
    }
    function tick() {
      setRemainingSeconds(Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000)));
    }
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [turnDeadline]);

  if (!gameState) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.cream }}>
        Loading game…
      </div>
    );
  }

  const me = gameState.players.find((p) => p.id === playerId);
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const myHand = gameState.you?.hand || [];
  const iAmSpectating = !!me?.escaped;
  const isMyTurn = gameState.status === "PLAYING" && gameState.currentPlayerId === playerId && !thullaBanner && !iAmSpectating;
  const mustLeadAceOfSpades = gameState.firstTrick && currentTrick.length === 0;
  const legalForMe = isMyTurn ? getLegalCardIds(myHand, gameState.leadSuit, mustLeadAceOfSpades) : [];
  const currentPlayer = gameState.players.find((p) => p.id === gameState.currentPlayerId);
  const currentPlayerName = currentPlayer?.displayName;
  const showCountdown = remainingSeconds !== null && currentPlayer && !currentPlayer.isBot;

  const seats = assignSeats(opponents);
  const colorIndexOf = (p) => gameState.players.findIndex((x) => x.id === p.id);
  const myRibbon = me?.escaped && me?.escapedAt && RIBBONS[me.escapedAt] ? RIBBONS[me.escapedAt] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: "relative" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 12px",
          flexShrink: 0,
          position: "relative",
          zIndex: 5,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            background: "rgba(0,0,0,0.4)",
            padding: "5px 10px",
            borderRadius: 999,
            letterSpacing: 0.5,
          }}
        >
          Trick {gameState.trickCount} · Thullas {gameState.thullaCount}
        </div>
        <div style={{ display: "flex", gap: 8, position: "relative" }}>
          <IconButton onClick={() => {}}>
            <ChatIcon />
          </IconButton>
          <IconButton onClick={() => setMenuOpen((v) => !v)}>
            <HamburgerIcon />
          </IconButton>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: 44,
                right: 0,
                background: "#fff",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                overflow: "hidden",
                minWidth: 150,
                zIndex: 20,
              }}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onLeave?.();
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  border: "none",
                  background: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.danger,
                  cursor: "pointer",
                }}
              >
                Leave table
              </button>
            </div>
          )}
        </div>
      </div>

      {autoPlayNotice && (
        <div
          style={{
            textAlign: "center",
            fontSize: 11.5,
            color: "#fff",
            background: "rgba(0,0,0,0.4)",
            padding: "6px 10px",
            flexShrink: 0,
            marginBottom: 4,
          }}
        >
          ⏱ {autoPlayNotice}
        </div>
      )}

      {/* Top seat */}
      <div style={{ display: "flex", justifyContent: "center", padding: "2px 8px 6px", flexShrink: 0 }}>
        {seats.top && <OpponentSeat player={seats.top} colorIndex={colorIndexOf(seats.top)} side="top" />}
      </div>

      {/* Middle: left seat — wood table — right seat */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", flex: 1, minHeight: 0 }}>
        <div style={{ flexShrink: 0 }}>{seats.left && <OpponentSeat player={seats.left} colorIndex={colorIndexOf(seats.left)} side="left" />}</div>

        <div
          className="bt-wood-table"
          style={{
            flex: 1,
            margin: "0 8px",
            minHeight: 140,
            borderRadius: 22,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            padding: "14px 8px",
          }}
        >
          {gameState.leadSuit && shownTrick.length > 0 && (
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.85)", marginBottom: 6, letterSpacing: 1, fontWeight: 700 }}>
              LEAD:{" "}
              <span style={{ color: gameState.leadSuit === "H" || gameState.leadSuit === "D" ? "#ffb0a3" : "#fff" }}>
                {SUIT_SYMBOL[gameState.leadSuit]} {SUIT_NAME[gameState.leadSuit]}
              </span>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", minHeight: 74, alignItems: "center" }}>
            {shownTrick.length === 0 && (
              <CardBack size="md" />
            )}
            {shownTrick.map((t) => (
              <div key={t.playerId} className="bt-pop" style={{ textAlign: "center" }}>
                <PlayingCard card={t.card} size="md" />
                <div style={{ fontSize: 9.5, color: "#fff", marginTop: 3, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
                  {t.displayName}
                </div>
              </div>
            ))}
          </div>
          {shownTrick.length === 0 && !thullaBanner && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 6 }}>
              {gameState.firstTrick ? "Waiting for A♠ to lead…" : `Waiting for ${currentPlayerName || "next player"}…`}
            </div>
          )}
          <ThullaBanner banner={thullaBanner} />
        </div>

        <div style={{ flexShrink: 0 }}>{seats.right && <OpponentSeat player={seats.right} colorIndex={colorIndexOf(seats.right)} side="right" />}</div>
      </div>

      {/* Bottom-left seat (4th opponent, when present) */}
      {seats.bottomLeft && (
        <div style={{ display: "flex", justifyContent: "flex-start", padding: "0 10px 6px", flexShrink: 0 }}>
          <OpponentSeat player={seats.bottomLeft} colorIndex={colorIndexOf(seats.bottomLeft)} side="left" />
        </div>
      )}

      {/* Status pill + my hand, or spectating panel */}
      <div style={{ flexShrink: 0, paddingBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,0,0,0.55)",
              color: isMyTurn ? COLORS.gold : "#fff",
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: 0.6,
              padding: "7px 18px",
              borderRadius: 999,
            }}
          >
            {myRibbon && <span>{myRibbon.label} {myRibbon.sub}</span>}
            {!myRibbon && (
              <span>
                {iAmSpectating ? "Spectating" : isMyTurn ? "Your Turn" : `${currentPlayerName || "…"}'s turn`}
              </span>
            )}
            {showCountdown && !iAmSpectating && (
              <span style={{ color: remainingSeconds <= 10 ? "#ff8a7a" : "rgba(255,255,255,0.8)" }}>⏱ {remainingSeconds}s</span>
            )}
          </div>
        </div>

        {iAmSpectating ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={onLeave}
              style={{
                background: `linear-gradient(180deg, #6fd0ff, #2fa9e8)`,
                color: "#fff",
                border: "2px solid rgba(255,255,255,0.7)",
                borderRadius: 14,
                padding: "13px 34px",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: 0.5,
                cursor: "pointer",
                boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
              }}
            >
              Claim &amp; Exit
            </button>
          </div>
        ) : (
          <div
            data-testid="my-hand"
            style={{
              display: "flex",
              justifyContent: myHand.length > 8 ? "flex-start" : "center",
              gap: 0,
              overflowX: "auto",
              padding: "6px 12px 4px",
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
        )}
        {selectedCard && (
          <div style={{ textAlign: "center", fontSize: 11, color: "#fff", marginTop: 6, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
            Tap again to play
          </div>
        )}
      </div>
    </div>
  );
}
