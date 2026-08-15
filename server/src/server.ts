import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { Server } from "socket.io";
import { ensureSchema } from "./db/pool";
import { loadActiveRooms } from "./db/repository";
import { registerRehydratedRoom } from "./realtime/rooms";
import { registerSocketHandlers, resumeTimersForRehydratedRoom } from "./realtime/socketHandlers";

const PORT = Number(process.env.PORT) || 3001;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST"] },
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Lightweight client-side error reporting so a player's browser console isn't
// the only record of a runtime failure.
app.use("/api", express.json({ limit: "20kb" }));
const clientErrorRate = new Map<string, { count: number; windowStart: number }>();
app.post("/api/log-client-error", (req, res) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const entry = clientErrorRate.get(ip);
  if (!entry || now - entry.windowStart > 60_000) {
    clientErrorRate.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
    if (entry.count > 30) {
      res.sendStatus(429);
      return;
    }
  }
  const { message, stack, url } = req.body || {};
  if (typeof message !== "string" || !message) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[client_error]", JSON.stringify({ message: message.slice(0, 2000), stack: typeof stack === "string" ? stack.slice(0, 4000) : undefined, url }));
  res.sendStatus(204);
});

// Serve the built client SPA (single-service deploy).
const clientDist = path.join(__dirname, "../../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

async function main(): Promise<void> {
  await ensureSchema();
  const rehydrated = await loadActiveRooms();
  for (const room of rehydrated) {
    registerRehydratedRoom(room);
  }
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Bhabhi Thulla server listening on port ${PORT} (${rehydrated.length} room(s) rehydrated)`);
    for (const room of rehydrated) {
      resumeTimersForRehydratedRoom(io, room);
    }
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("fatal_boot_error", err);
  process.exit(1);
});
