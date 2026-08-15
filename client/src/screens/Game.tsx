import React from "react";
import { useGame } from "../state/GameContext";
import { OpponentSeat } from "../components/OpponentSeat";
import { TrickArea } from "../components/TrickArea";
import { Hand } from "../components/Hand";
import { TurnBanner } from "../components/TurnBanner";
import { ThullaBanner } from "../components/ThullaBanner";
import { ToastStack, Toast } from "../components/Toast";

export function Game() {
  const {
    state,
    playerId,
    playCard,
    thullaEvent,
    escapeToast,
    hostChangedName,
    autoPlayedName,
    reconnectedName,
    disconnectedName,
    setScreen,
  } = useGame();

  if (!state || !state.you) {
    return <div className="min-h-full flex items-center justify-center text-neutral-400 text-sm">Loading table…</div>;
  }

  const me = state.players.find((p) => p.id === playerId);
  const opponents = state.players.filter((p) => p.id !== playerId);
  const isMyTurn = state.currentPlayerId === playerId && !me?.escaped;
  const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId);

  return (
    <div className="min-h-full flex flex-col">
      {thullaEvent && <ThullaBanner info={thullaEvent} />}
      <ToastStack>
        {escapeToast && <Toast tone="success">{escapeToast.displayName} escaped! 🎉</Toast>}
        {hostChangedName && <Toast>{hostChangedName} is now the host</Toast>}
        {autoPlayedName && <Toast tone="warning">{autoPlayedName} took too long — auto-played</Toast>}
        {reconnectedName && <Toast tone="success">{reconnectedName} reconnected</Toast>}
        {disconnectedName && <Toast tone="warning">{disconnectedName} disconnected</Toast>}
      </ToastStack>

      <div className="flex items-center justify-between px-4 py-2 text-xs text-neutral-500">
        <span>Room {state.roomCode}</span>
        <div className="flex items-center gap-3">
          <span>Trick #{state.trickNumber + 1}</span>
          <button onClick={() => setScreen("howto")} className="hover:text-white underline underline-offset-2">
            Rules
          </button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-1 gap-y-3 px-3 py-2">
        {opponents.map((p) => (
          <OpponentSeat key={p.id} player={p} isHost={p.id === state.hostPlayerId} compact={opponents.length > 5} />
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <TrickArea trick={state.currentTrick} leadSuit={state.leadSuit} />
        <TurnBanner isMyTurn={isMyTurn} currentPlayerName={currentPlayer?.displayName ?? null} turnDeadline={state.turnDeadline} />
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-felt-950 via-felt-950/95 to-transparent pt-4">
        {me?.escaped ? (
          <div className="text-center text-sm text-emerald-400 pb-6">You've escaped! Watching the rest of the game…</div>
        ) : (
          <Hand hand={state.you.hand} legalCardIds={state.you.legalCardIds} isMyTurn={isMyTurn} onPlay={playCard} />
        )}
      </div>
    </div>
  );
}
