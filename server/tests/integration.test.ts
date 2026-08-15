import assert from "node:assert/strict";
import { test } from "node:test";
import http from "node:http";
import { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { registerSocketHandlers } from "../src/realtime/socketHandlers";

// End-to-end multiplayer test against real sockets (no mocking of the game
// layer) — covers room creation/join, dealing, turn rotation, and the
// concurrency guarantee that two near-simultaneous PLAY_CARD requests from
// the same acting player can never both succeed (spec §26/§48).

function startServer(): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const httpServer = http.createServer();
    const io = new Server(httpServer, { cors: { origin: true } });
    io.on("connection", (socket) => registerSocketHandlers(io, socket));
    httpServer.listen(0, () => {
      const { port } = httpServer.address() as AddressInfo;
      resolve({
        url: `http://localhost:${port}`,
        close: () =>
          new Promise((res) => {
            io.close();
            httpServer.close(() => res());
          }),
      });
    });
  });
}

function waitFor<T = any>(socket: ClientSocket, event: string, predicate?: (payload: T) => boolean, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    const handler = (payload: T) => {
      if (predicate && !predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

test("full multiplayer game: create, join, deal, play to Bhabhi, with a concurrency race", async (t) => {
  const { url, close } = await startServer();
  t.after(() => close());

  const NUM_PLAYERS = 4;
  const clients: ClientSocket[] = [];
  for (let i = 0; i < NUM_PLAYERS; i++) {
    clients.push(ioClient(url, { transports: ["websocket"], forceNew: true }));
  }
  await Promise.all(clients.map((c) => waitFor(c, "connect")));

  const host = clients[0];
  host.emit("CREATE_ROOM", { displayName: "Alice", maxPlayers: NUM_PLAYERS, withBots: false });
  const created = await waitFor<{ roomCode: string; playerId: string }>(host, "ROOM_CREATED");
  const roomCode = created.roomCode;
  const playerIds: string[] = [created.playerId];

  for (let i = 1; i < NUM_PLAYERS; i++) {
    clients[i].emit("JOIN_ROOM", { roomCode, displayName: `Player${i}` });
    const joined = await waitFor<{ playerId: string }>(clients[i], "ROOM_JOINED");
    playerIds.push(joined.playerId);
  }

  // Every player only ever sees their own hand.
  const latestState = new Map<string, any>();
  clients.forEach((c, i) => {
    c.on("STATE_UPDATE", (s) => latestState.set(playerIds[i], s));
  });

  host.emit("START_GAME", {});
  await waitFor(host, "GAME_STARTED");
  await pollUntil(() => playerIds.every((id) => latestState.has(id)));

  for (let i = 0; i < NUM_PLAYERS; i++) {
    const s = latestState.get(playerIds[i]);
    assert.equal(s.you.id, playerIds[i]);
    assert.ok(Array.isArray(s.you.hand));
    // Never see another player's hand contents.
    for (const p of s.players) assert.equal("hand" in p, false);
  }

  const totalDealt = clients.reduce((sum, c, i) => sum + latestState.get(playerIds[i]).you.hand.length, 0);
  assert.equal(totalDealt, 52);

  // --- Concurrency race: fire two PLAY_CARD requests back-to-back from the
  // player whose turn it currently is, for two different legal cards. Only
  // one may succeed; the other must be rejected.
  const gameFinished = { flag: false };
  clients.forEach((c) => c.on("GAME_FINISHED", () => (gameFinished.flag = true)));

  let raceTested = false;
  let guard = 0;
  while (!gameFinished.flag && guard < 400) {
    guard += 1;
    const turnPlayerId = [...latestState.values()][0]?.currentPlayerId;
    const idx = playerIds.indexOf(turnPlayerId);
    if (idx === -1) {
      await sleep(20);
      continue;
    }
    const client = clients[idx];
    const state = latestState.get(playerIds[idx]);
    const legal: string[] = state.you.legalCardIds;
    if (!legal || legal.length === 0) {
      await sleep(20);
      continue;
    }

    if (!raceTested && legal.length >= 2) {
      raceTested = true;
      const errors: string[] = [];
      client.on("ERROR", (e: { message: string }) => errors.push(e.message));
      const beforeTrickN = state.trickNumber;
      client.emit("PLAY_CARD", { cardId: legal[0] });
      client.emit("PLAY_CARD", { cardId: legal[1] });
      await waitFor(client, "STATE_UPDATE", (s: any) => s.trickNumber !== beforeTrickN || s.currentPlayerId !== turnPlayerId || s.you.hand.length < state.you.hand.length);
      await sleep(150);
      assert.ok(errors.length >= 1, "expected the second simultaneous PLAY_CARD to be rejected");
      continue;
    }

    client.emit("PLAY_CARD", { cardId: legal[0] });
    await sleep(15);
  }

  assert.equal(gameFinished.flag, true, "game did not reach GAME_FINISHED in time");
  assert.equal(raceTested, true, "concurrency race scenario never had the opportunity to run");

  clients.forEach((c) => c.close());
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUntil(predicate: () => boolean, timeoutMs = 8000, intervalMs = 20): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("pollUntil timed out");
    await sleep(intervalMs);
  }
}
