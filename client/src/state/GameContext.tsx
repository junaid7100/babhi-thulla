import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../api/socket";
import { LobbyView, ResultsView, StateView, ThullaInfo } from "../types";
import { clearSession, loadSession, saveSession, StoredSession } from "../session";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { playSound } from "../sound";

export type Screen = "home" | "create" | "join" | "lobby" | "game" | "results" | "howto" | "settings";

interface Settings {
  sound: boolean;
  animationSpeed: "normal" | "fast";
  onboardingSeen: boolean;
}

interface EscapeToast {
  displayName: string;
  finishPosition: number;
}

interface GameContextValue {
  connectionStatus: "connecting" | "connected" | "disconnected";
  screen: Screen;
  setScreen: (s: Screen) => void;
  lobby: LobbyView | null;
  state: StateView | null;
  results: ResultsView | null;
  error: string | null;
  dismissError: () => void;
  thullaEvent: ThullaInfo | null;
  escapeToast: EscapeToast | null;
  hostChangedName: string | null;
  autoPlayedName: string | null;
  reconnectedName: string | null;
  disconnectedName: string | null;
  expiredMessage: string | null;
  playerId: string | null;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  createRoom: (displayName: string, maxPlayers: number, withBots: boolean) => void;
  joinRoom: (roomCode: string, displayName: string) => void;
  startGame: () => void;
  playCard: (cardId: string) => void;
  leaveRoom: () => void;
  playAgain: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [screen, setScreen] = useState<Screen>("home");
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [state, setState] = useState<StateView | null>(null);
  const [results, setResults] = useState<ResultsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thullaEvent, setThullaEvent] = useState<ThullaInfo | null>(null);
  const [escapeToast, setEscapeToast] = useState<EscapeToast | null>(null);
  const [hostChangedName, setHostChangedName] = useState<string | null>(null);
  const [autoPlayedName, setAutoPlayedName] = useState<string | null>(null);
  const [reconnectedName, setReconnectedName] = useState<string | null>(null);
  const [disconnectedName, setDisconnectedName] = useState<string | null>(null);
  const [expiredMessage, setExpiredMessage] = useState<string | null>(null);
  const [settings, setSettings] = useLocalStorage<Settings>("bhabhi-thulla:settings", {
    sound: true,
    animationSpeed: "normal",
    onboardingSeen: false,
  });

  const sessionRef = useRef<StoredSession | null>(loadSession());
  const playerIdRef = useRef<string | null>(sessionRef.current?.playerId ?? null);
  const [playerId, setPlayerId] = useState<string | null>(playerIdRef.current);
  const prevHandSize = useRef<number>(0);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings({ ...settingsRef.current, ...patch }), [setSettings]);

  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      setConnectionStatus("connected");
      const session = loadSession();
      if (session && session.roomCode) {
        socket.emit("RECONNECT_TO_ROOM", session);
      }
    };
    const onDisconnect = () => setConnectionStatus("disconnected");

    const onRoomCreated = (payload: { roomCode: string; playerId: string; playerSecret: string }) => {
      const s: StoredSession = { ...payload, displayName: "" };
      saveSession(s);
      sessionRef.current = s;
      playerIdRef.current = payload.playerId;
      setPlayerId(payload.playerId);
      setScreen("lobby");
    };
    const onRoomJoined = (payload: { roomCode: string; playerId: string; playerSecret: string }) => {
      const existing = loadSession();
      const s: StoredSession = { ...payload, displayName: existing?.displayName ?? "" };
      saveSession(s);
      sessionRef.current = s;
      playerIdRef.current = payload.playerId;
      setPlayerId(payload.playerId);
      setScreen((cur) => (cur === "game" || cur === "results" ? cur : "lobby"));
    };
    const onRoomUpdated = (payload: LobbyView) => {
      setLobby(payload);
      setScreen((cur) => {
        if (payload.status === "PLAYING" || payload.status === "GAME_FINISHED") return cur;
        return cur === "home" || cur === "create" || cur === "join" ? "lobby" : cur;
      });
    };
    const onGameStarted = () => {
      setResults(null);
      setScreen("game");
    };
    const onStateUpdate = (payload: StateView) => {
      setState(payload);
      if (payload.you && payload.you.hand.length !== prevHandSize.current && payload.currentPlayerId === payload.you.id) {
        playSound("yourTurn", settingsRef.current.sound);
      }
      prevHandSize.current = payload.you?.hand.length ?? 0;
      setScreen((cur) => (cur === "home" || cur === "create" || cur === "join" || cur === "lobby" ? "game" : cur));
    };
    const onThulla = (payload: ThullaInfo) => {
      playSound("thulla", settingsRef.current.sound);
      setThullaEvent(payload);
      window.setTimeout(() => setThullaEvent((cur) => (cur === payload ? null : cur)), 1800);
    };
    const onPlayerEscaped = (payload: EscapeToast) => {
      playSound("escape", settingsRef.current.sound);
      setEscapeToast(payload);
      window.setTimeout(() => setEscapeToast((cur) => (cur === payload ? null : cur)), 2200);
    };
    const onGameFinished = (payload: ResultsView) => {
      playSound("gameOver", settingsRef.current.sound);
      setResults(payload);
      setScreen("results");
    };
    const onHostChanged = (payload: { hostName?: string }) => {
      if (!payload.hostName) return;
      setHostChangedName(payload.hostName);
      window.setTimeout(() => setHostChangedName((cur) => (cur === payload.hostName ? null : cur)), 3000);
    };
    const onTurnAutoPlayed = (payload: { displayName: string }) => {
      setAutoPlayedName(payload.displayName);
      window.setTimeout(() => setAutoPlayedName((cur) => (cur === payload.displayName ? null : cur)), 2500);
    };
    const onPlayerReconnected = (payload: { displayName: string }) => {
      setReconnectedName(payload.displayName);
      window.setTimeout(() => setReconnectedName((cur) => (cur === payload.displayName ? null : cur)), 2500);
    };
    const onPlayerDisconnected = (payload: { displayName: string }) => {
      setDisconnectedName(payload.displayName);
      window.setTimeout(() => setDisconnectedName((cur) => (cur === payload.displayName ? null : cur)), 2500);
    };
    const onRoomExpired = (payload: { message: string }) => {
      setExpiredMessage(payload.message);
      clearSession();
      setLobby(null);
      setState(null);
      setScreen("home");
    };
    const onError = (payload: { message: string }) => {
      setError(payload.message);
      const staleSessionErrors = ["Room not found.", "Player not found in this room.", "Invalid reconnection credentials."];
      if (staleSessionErrors.includes(payload.message)) {
        clearSession();
        setLobby(null);
        setState(null);
        setScreen((cur) => (cur === "game" || cur === "lobby" || cur === "results" ? "home" : cur));
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("ROOM_CREATED", onRoomCreated);
    socket.on("ROOM_JOINED", onRoomJoined);
    socket.on("ROOM_UPDATED", onRoomUpdated);
    socket.on("GAME_STARTED", onGameStarted);
    socket.on("STATE_UPDATE", onStateUpdate);
    socket.on("THULLA", onThulla);
    socket.on("PLAYER_ESCAPED", onPlayerEscaped);
    socket.on("GAME_FINISHED", onGameFinished);
    socket.on("HOST_CHANGED", onHostChanged);
    socket.on("TURN_AUTO_PLAYED", onTurnAutoPlayed);
    socket.on("PLAYER_RECONNECTED", onPlayerReconnected);
    socket.on("PLAYER_DISCONNECTED", onPlayerDisconnected);
    socket.on("ROOM_EXPIRED", onRoomExpired);
    socket.on("ERROR", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("ROOM_CREATED", onRoomCreated);
      socket.off("ROOM_JOINED", onRoomJoined);
      socket.off("ROOM_UPDATED", onRoomUpdated);
      socket.off("GAME_STARTED", onGameStarted);
      socket.off("STATE_UPDATE", onStateUpdate);
      socket.off("THULLA", onThulla);
      socket.off("PLAYER_ESCAPED", onPlayerEscaped);
      socket.off("GAME_FINISHED", onGameFinished);
      socket.off("HOST_CHANGED", onHostChanged);
      socket.off("TURN_AUTO_PLAYED", onTurnAutoPlayed);
      socket.off("PLAYER_RECONNECTED", onPlayerReconnected);
      socket.off("PLAYER_DISCONNECTED", onPlayerDisconnected);
      socket.off("ROOM_EXPIRED", onRoomExpired);
      socket.off("ERROR", onError);
    };
  }, []);

  const createRoom = useCallback((displayName: string, maxPlayers: number, withBots: boolean) => {
    saveSession({ roomCode: "", playerId: "", playerSecret: "", displayName });
    socket.emit("CREATE_ROOM", { displayName, maxPlayers, withBots });
  }, []);

  const joinRoom = useCallback((roomCode: string, displayName: string) => {
    saveSession({ roomCode: "", playerId: "", playerSecret: "", displayName });
    socket.emit("JOIN_ROOM", { roomCode, displayName });
  }, []);

  const startGame = useCallback(() => socket.emit("START_GAME", {}), []);
  const playCard = useCallback((cardId: string) => {
    playSound("cardPlay", settingsRef.current.sound);
    socket.emit("PLAY_CARD", { cardId });
  }, []);
  const leaveRoom = useCallback(() => {
    socket.emit("LEAVE_ROOM", {});
    clearSession();
    setLobby(null);
    setState(null);
    setResults(null);
    setScreen("home");
  }, []);
  const playAgain = useCallback(() => socket.emit("PLAY_AGAIN", {}), []);
  const dismissError = useCallback(() => setError(null), []);

  const value = useMemo<GameContextValue>(
    () => ({
      connectionStatus,
      screen,
      setScreen,
      lobby,
      state,
      results,
      error,
      dismissError,
      thullaEvent,
      escapeToast,
      hostChangedName,
      autoPlayedName,
      reconnectedName,
      disconnectedName,
      expiredMessage,
      playerId,
      settings,
      updateSettings,
      createRoom,
      joinRoom,
      startGame,
      playCard,
      leaveRoom,
      playAgain,
    }),
    [
      connectionStatus,
      screen,
      lobby,
      state,
      results,
      error,
      dismissError,
      thullaEvent,
      escapeToast,
      hostChangedName,
      autoPlayedName,
      reconnectedName,
      disconnectedName,
      expiredMessage,
      playerId,
      settings,
      updateSettings,
      createRoom,
      joinRoom,
      startGame,
      playCard,
      leaveRoom,
      playAgain,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
