import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

// Singleton socket connection, reused across all components.
// Let socket.io negotiate the transport itself (starts on HTTP long-polling,
// upgrades to WebSocket once established) — forcing "websocket" first is
// unreliable behind Render's proxy during cold starts and can make some
// socket.io-client versions retry synchronously until the call stack blows.
export const socket = io(SOCKET_URL, {
  autoConnect: true,
});
