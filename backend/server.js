const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { registerSocketHandlers } = require("./socketHandlers");
const { logClientError } = require("./errorLog");

const PORT = process.env.PORT || 3001;
// Comma-separated list of allowed origins, e.g. "https://bhabhi-thulla.onrender.com,http://localhost:5173"
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const allowedOrigins = FRONTEND_ORIGIN === "*" ? "*" : FRONTEND_ORIGIN.split(",").map((s) => s.trim());

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("Bhabhi Thulla backend is running.");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// --- Client-side console/runtime error logging ---
// The frontend posts window "error"/"unhandledrejection" events and console.error()
// calls here so we have a persistent record instead of relying on a player screenshotting
// their browser console (see frontend/src/errorReporter.js).
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins === "*") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use("/api", express.json({ limit: "20kb" }));

const CLIENT_ERROR_RATE_LIMIT = 30; // per IP per minute
const CLIENT_ERROR_WINDOW_MS = 60_000;
const clientErrorRateLimits = new Map(); // ip -> { count, windowStart }

function isRateLimited(ip) {
  const now = Date.now();
  const entry = clientErrorRateLimits.get(ip);
  if (!entry || now - entry.windowStart > CLIENT_ERROR_WINDOW_MS) {
    clientErrorRateLimits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > CLIENT_ERROR_RATE_LIMIT;
}

app.post("/api/log-client-error", (req, res) => {
  if (isRateLimited(req.ip)) {
    res.sendStatus(429);
    return;
  }
  const { type, message, stack, url, userAgent, timestamp, source, line, col } = req.body || {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }
  logClientError({
    type: typeof type === "string" ? type.slice(0, 40) : "unknown",
    message: message.slice(0, 2000),
    stack: typeof stack === "string" ? stack.slice(0, 4000) : undefined,
    url: typeof url === "string" ? url.slice(0, 500) : undefined,
    userAgent: typeof userAgent === "string" ? userAgent.slice(0, 300) : undefined,
    clientTimestamp: typeof timestamp === "string" ? timestamp.slice(0, 60) : undefined,
    source: typeof source === "string" ? source.slice(0, 300) : undefined,
    line: Number.isFinite(line) ? line : undefined,
    col: Number.isFinite(col) ? col : undefined,
  });
  res.sendStatus(204);
});

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

server.listen(PORT, () => {
  console.log(`Bhabhi Thulla backend listening on port ${PORT}`);
});
