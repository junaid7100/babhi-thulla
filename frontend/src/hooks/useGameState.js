import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../socket.js";
import { STORAGE_KEY } from "../constants.js";

function saveSession(roomCode, playerId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomCode, playerId }));
  } catch {
    // localStorage unavailable — ignore, reconnect-on-refresh just won't work.
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Subscribes to socket events and exposes the current player-specific game view.
export function useGameState() {
  const [connected, setConnected] = useState(socket.connected);
  const [roomCode, setRoomCode] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [lobby, setLobby] = useState(null); // ROOM_UPDATED payload
  const [gameState, setGameState] = useState(null); // STATE_UPDATE payload
  const [thullaBanner, setThullaBanner] = useState(null);
  const [gameFinished, setGameFinished] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [autoPlayNotice, setAutoPlayNotice] = useState(null);
  const [reconnecting, setReconnecting] = useState(() => !!loadSession());
  const attemptedReconnect = useRef(false);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      const saved = loadSession();
      if (saved && !attemptedReconnect.current) {
        attemptedReconnect.current = true;
        setReconnecting(true);
        socket.emit("RECONNECT", saved);
      } else {
        setReconnecting(false);
      }
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onRoomCreated({ roomCode, playerId }) {
      setRoomCode(roomCode);
      setPlayerId(playerId);
      saveSession(roomCode, playerId);
    }
    function onRoomJoined({ roomCode, playerId }) {
      setRoomCode(roomCode);
      setPlayerId(playerId);
      saveSession(roomCode, playerId);
      setReconnecting(false);
    }
    function onRoomUpdated(payload) {
      setLobby(payload);
    }
    function onGameStarted() {
      setGameFinished(null);
      setThullaBanner(null);
    }
    function onStateUpdate(payload) {
      setGameState(payload);
    }
    function onThulla(payload) {
      setThullaBanner(payload);
    }
    function onGameFinished(payload) {
      setGameFinished(payload);
    }
    function onTurnAutoPlayed({ displayName }) {
      setAutoPlayNotice(`${displayName} ran out of time — a card was auto-played.`);
    }
    function onRoomExpired({ message }) {
      clearSession();
      setRoomCode(null);
      setPlayerId(null);
      setLobby(null);
      setGameState(null);
      setGameFinished(null);
      setErrorMessage(message || "This room has expired.");
    }
    function onError({ message }) {
      setErrorMessage(message);
      if (message === "Room not found." || message === "Player not found in this room.") {
        clearSession();
      }
      setReconnecting(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("ROOM_CREATED", onRoomCreated);
    socket.on("ROOM_JOINED", onRoomJoined);
    socket.on("ROOM_UPDATED", onRoomUpdated);
    socket.on("GAME_STARTED", onGameStarted);
    socket.on("STATE_UPDATE", onStateUpdate);
    socket.on("THULLA", onThulla);
    socket.on("GAME_FINISHED", onGameFinished);
    socket.on("TURN_AUTO_PLAYED", onTurnAutoPlayed);
    socket.on("ROOM_EXPIRED", onRoomExpired);
    socket.on("ERROR", onError);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("ROOM_CREATED", onRoomCreated);
      socket.off("ROOM_JOINED", onRoomJoined);
      socket.off("ROOM_UPDATED", onRoomUpdated);
      socket.off("GAME_STARTED", onGameStarted);
      socket.off("STATE_UPDATE", onStateUpdate);
      socket.off("THULLA", onThulla);
      socket.off("GAME_FINISHED", onGameFinished);
      socket.off("TURN_AUTO_PLAYED", onTurnAutoPlayed);
      socket.off("ROOM_EXPIRED", onRoomExpired);
      socket.off("ERROR", onError);
    };
  }, []);

  useEffect(() => {
    if (thullaBanner) {
      const t = setTimeout(() => setThullaBanner(null), 1500);
      return () => clearTimeout(t);
    }
  }, [thullaBanner]);

  useEffect(() => {
    if (autoPlayNotice) {
      const t = setTimeout(() => setAutoPlayNotice(null), 2500);
      return () => clearTimeout(t);
    }
  }, [autoPlayNotice]);

  const createRoom = useCallback((displayName, maxPlayers, withBots) => {
    socket.emit("CREATE_ROOM", { displayName, maxPlayers, withBots });
  }, []);

  const joinRoom = useCallback((code, displayName) => {
    socket.emit("JOIN_ROOM", { roomCode: code, displayName });
  }, []);

  const startGame = useCallback(
    (code) => {
      socket.emit("START_GAME", { roomCode: code || roomCode });
    },
    [roomCode]
  );

  const playCard = useCallback(
    (cardId) => {
      socket.emit("PLAY_CARD", { roomCode, cardId });
    },
    [roomCode]
  );

  const playAgain = useCallback(() => {
    socket.emit("PLAY_AGAIN", { roomCode });
  }, [roomCode]);

  const leaveRoom = useCallback(() => {
    socket.emit("LEAVE_ROOM", { roomCode });
    clearSession();
    setRoomCode(null);
    setPlayerId(null);
    setLobby(null);
    setGameState(null);
    setGameFinished(null);
  }, [roomCode]);

  const clearError = useCallback(() => setErrorMessage(null), []);

  return {
    connected,
    reconnecting,
    roomCode,
    playerId,
    lobby,
    gameState,
    thullaBanner,
    gameFinished,
    errorMessage,
    autoPlayNotice,
    createRoom,
    joinRoom,
    startGame,
    playCard,
    playAgain,
    leaveRoom,
    clearError,
  };
}
