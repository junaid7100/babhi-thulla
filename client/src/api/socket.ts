import { io, Socket } from "socket.io-client";

// Same-origin in production (single Render service serves both the API and
// the built SPA); VITE_SOCKET_URL only matters for local dev against a
// separately-running backend.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});
