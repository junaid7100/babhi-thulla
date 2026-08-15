const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { registerSocketHandlers } = require("./socketHandlers");

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

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

server.listen(PORT, () => {
  console.log(`Bhabhi Thulla backend listening on port ${PORT}`);
});
