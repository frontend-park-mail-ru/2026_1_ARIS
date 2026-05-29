#!/usr/bin/env node

const DEFAULT_ORIGIN = "http://localhost:3001";
const DEFAULT_USERS = 50;
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_DURATION_SEC = 120;
const DEFAULT_ANSWER_DELAY_MS = 1200;
const GUEST_FIRST_NAMES = [
  "Александр",
  "Дмитрий",
  "Сергей",
  "Андрей",
  "Илья",
  "Павел",
  "Михаил",
  "Никита",
  "Роман",
  "Егор",
];
const GUEST_LAST_NAMES = [
  "Иванов",
  "Петров",
  "Сидоров",
  "Смирнов",
  "Кузнецов",
  "Попов",
  "Васильев",
  "Новиков",
  "Федоров",
  "Морозов",
  "Волков",
  "Алексеев",
  "Лебедев",
  "Семенов",
  "Егоров",
  "Павлов",
  "Козлов",
  "Степанов",
  "Николаев",
  "Орлов",
  "Андреев",
  "Макаров",
  "Захаров",
  "Зайцев",
  "Соловьев",
  "Борисов",
  "Яковлев",
  "Григорьев",
  "Романов",
  "Воробьев",
];

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = "true";
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function printHelp() {
  console.log(`
Public lobby load test

Usage:
  npm run load:public-lobby -- --invite 7YQSHJ --users 50
  npm run load:public-lobby -- --create --start --cookie "session=..." --users 50

Options:
  --origin <url>             Frontend/proxy origin. Default: ${DEFAULT_ORIGIN}
  --invite <code>            Existing public lobby invite code.
  --create                   Create a public lobby before joining. Requires --cookie.
  --start                    Start the room after all guests connect. Requires --cookie.
  --cookie <cookie>          Admin Cookie header for create/start requests.
  --users <number>           Guest count. Default: ${DEFAULT_USERS}
  --concurrency <number>     Concurrent join requests. Default: ${DEFAULT_CONCURRENCY}
  --duration <seconds>       Max runtime after sockets open. Default: ${DEFAULT_DURATION_SEC}
  --answer-delay <ms>        Max random answer delay per question. Default: ${DEFAULT_ANSWER_DELAY_MS}
  --answer <number>          Fixed answer sent by every guest. Default: random 1..100.
  --help                     Show this help.
`);
}

function asPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function getField(raw, keys) {
  if (!raw || typeof raw !== "object") return "";
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function extractRoom(raw) {
  if (!raw || typeof raw !== "object") return {};
  return raw.room || raw.Room || raw;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

function createApiClient(origin, cookie) {
  return async function api(path, options = {}) {
    const headers = {
      Accept: "application/json",
      "Accept-Language": "ru",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    };
    const response = await fetch(new URL(path, origin), {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { text };
    }
    if (!response.ok) {
      const message =
        data && typeof data === "object" && typeof data.error === "string"
          ? data.error
          : text || response.statusText;
      throw new Error(`${response.status} ${message}`);
    }
    return data;
  };
}

function buildWsUrl(origin, roomId, token) {
  const url = new URL(origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/ws/games/public/${encodeURIComponent(roomId)}`;
  url.search = new URLSearchParams({ lang: "ru", token }).toString();
  return url.toString();
}

async function createPublicRoom(api, answerTimeoutSec, roundPauseSec) {
  const data = await api("/api/games/public-rooms", {
    method: "POST",
    body: { answerTimeoutSec, roundPauseSec },
  });
  return extractRoom(data);
}

async function joinGuest(api, inviteCode, index) {
  const startedAt = performance.now();
  const firstName = GUEST_FIRST_NAMES[index % GUEST_FIRST_NAMES.length];
  const lastName =
    GUEST_LAST_NAMES[Math.floor(index / GUEST_FIRST_NAMES.length) % GUEST_LAST_NAMES.length];
  const data = await api(`/api/games/public-rooms/${encodeURIComponent(inviteCode)}/join`, {
    method: "POST",
    body: { firstName, lastName },
  });
  const room = extractRoom(data);
  const token = getField(data, ["token", "Token"]);
  const roomId = getField(room, ["id", "ID", "roomId", "RoomID"]);
  if (!token || !roomId) {
    throw new Error(`invalid join response for guest ${index + 1}`);
  }
  return {
    firstName,
    lastName,
    token,
    roomId,
    latencyMs: performance.now() - startedAt,
  };
}

function createSocketClient({ origin, guest, metrics, answerDelayMs, fixedAnswer }) {
  const answeredQuestions = new Set();
  const socket = new WebSocket(buildWsUrl(origin, guest.roomId, guest.token));
  let settled = false;

  function answerQuestion(room) {
    const question = room.currentQuestion || room.CurrentQuestion;
    const status = getField(room, ["status", "Status"]);
    const questionId = getField(question, ["id", "ID"]);
    if (status !== "active" || !questionId || answeredQuestions.has(questionId)) return;
    answeredQuestions.add(questionId);
    const answer =
      fixedAnswer === undefined ? Math.floor(Math.random() * 100) + 1 : Number(fixedAnswer);
    const delay = Math.floor(Math.random() * answerDelayMs);
    setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ type: "submit_answer", answer }));
      metrics.answersSent += 1;
    }, delay);
  }

  const opened = new Promise((resolve) => {
    socket.addEventListener("open", () => {
      settled = true;
      metrics.wsOpened += 1;
      resolve(true);
    });
    socket.addEventListener("error", () => {
      metrics.wsErrors += 1;
      if (!settled) {
        settled = true;
        resolve(false);
      }
    });
    socket.addEventListener("close", () => {
      metrics.wsClosed += 1;
      if (!settled) {
        settled = true;
        resolve(false);
      }
    });
    socket.addEventListener("message", (event) => {
      metrics.wsMessages += 1;
      try {
        const payload = JSON.parse(String(event.data));
        const room = payload.room || payload.Room || payload;
        const players = Array.isArray(room.players)
          ? room.players
          : Array.isArray(room.Players)
            ? room.Players
            : [];
        metrics.maxPlayersSeen = Math.max(metrics.maxPlayersSeen, players.length);
        const status = getField(room, ["status", "Status"]);
        if (status === "finished") metrics.finishedSeen += 1;
        answerQuestion(room);
      } catch {
        metrics.wsParseErrors += 1;
      }
    });
  });

  return { socket, opened };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }
  if (typeof WebSocket === "undefined") {
    throw new Error("Global WebSocket is unavailable. Use Node 22+ for this script.");
  }

  const origin = args.origin || process.env.ORIGIN || DEFAULT_ORIGIN;
  const users = asPositiveInt(args.users || process.env.USERS, DEFAULT_USERS);
  const concurrency = asPositiveInt(args.concurrency || process.env.CONCURRENCY, DEFAULT_CONCURRENCY);
  const durationSec = asPositiveInt(args.duration || process.env.DURATION, DEFAULT_DURATION_SEC);
  const answerDelayMs = asPositiveInt(
    args["answer-delay"] || process.env.ANSWER_DELAY_MS,
    DEFAULT_ANSWER_DELAY_MS,
  );
  const cookie = args.cookie || process.env.ADMIN_COOKIE || "";
  const shouldCreate = args.create === "true" || process.env.CREATE_PUBLIC_LOBBY === "true";
  const shouldStart = args.start === "true" || process.env.START_PUBLIC_LOBBY === "true";
  const fixedAnswer = args.answer || process.env.ANSWER;

  if ((shouldCreate || shouldStart) && !cookie) {
    throw new Error("--cookie is required for --create or --start");
  }

  const api = createApiClient(origin, cookie);
  let inviteCode = String(args.invite || process.env.INVITE || "").trim().toUpperCase();
  let roomId = String(args.room || process.env.ROOM_ID || "").trim();

  if (shouldCreate) {
    const room = await createPublicRoom(
      api,
      asPositiveInt(args["answer-timeout"] || process.env.ANSWER_TIMEOUT_SEC, 7),
      asPositiveInt(args["round-pause"] || process.env.ROUND_PAUSE_SEC, 5),
    );
    inviteCode = getField(room, ["inviteCode", "InviteCode"]);
    roomId = getField(room, ["id", "ID"]);
    console.log(`created public room: roomId=${roomId} invite=${inviteCode}`);
  }

  if (!inviteCode) {
    throw new Error("--invite is required unless --create is used");
  }

  const metrics = {
    joined: 0,
    joinFailed: 0,
    wsOpened: 0,
    wsClosed: 0,
    wsErrors: 0,
    wsParseErrors: 0,
    wsMessages: 0,
    answersSent: 0,
    finishedSeen: 0,
    maxPlayersSeen: 0,
  };
  const joinLatencies = [];
  const guests = [];
  const indexes = Array.from({ length: users }, (_, index) => index);

  const joinStartedAt = performance.now();
  await runPool(indexes, concurrency, async (index) => {
    try {
      const guest = await joinGuest(api, inviteCode, index);
      metrics.joined += 1;
      joinLatencies.push(guest.latencyMs);
      guests[index] = guest;
      roomId = roomId || guest.roomId;
    } catch (error) {
      metrics.joinFailed += 1;
      console.error(`join failed #${index + 1}: ${error.message}`);
    }
  });
  const joinDurationMs = performance.now() - joinStartedAt;

  console.log(
    `joined ${metrics.joined}/${users} guests in ${Math.round(joinDurationMs)}ms, p50=${Math.round(
      percentile(joinLatencies, 50),
    )}ms p95=${Math.round(percentile(joinLatencies, 95))}ms`,
  );

  const clients = guests
    .filter(Boolean)
    .map((guest) => createSocketClient({ origin, guest, metrics, answerDelayMs, fixedAnswer }));
  await Promise.race([
    Promise.all(clients.map((client) => client.opened)),
    sleep(Math.max(5000, users * 250)),
  ]);
  console.log(`websockets opened ${metrics.wsOpened}/${clients.length}`);

  if (shouldStart) {
    await api(`/api/games/rooms/${encodeURIComponent(roomId)}/start`, { method: "POST" });
    console.log("room started");
  } else {
    console.log("waiting for manual room start...");
  }

  const startedAt = Date.now();
  const interval = setInterval(() => {
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `[${elapsedSec}s] ws=${metrics.wsOpened - metrics.wsClosed}/${clients.length} messages=${metrics.wsMessages} answers=${metrics.answersSent} maxPlayers=${metrics.maxPlayersSeen}`,
    );
  }, 5000);

  await sleep(durationSec * 1000);
  clearInterval(interval);
  clients.forEach((client) => client.socket.close());
  await sleep(250);

  console.log("\nSummary");
  console.log(`invite: ${inviteCode}`);
  console.log(`roomId: ${roomId}`);
  console.log(`joined: ${metrics.joined}/${users}`);
  console.log(`join failed: ${metrics.joinFailed}`);
  console.log(`join latency p50/p95: ${Math.round(percentile(joinLatencies, 50))}ms / ${Math.round(percentile(joinLatencies, 95))}ms`);
  console.log(`websocket opened: ${metrics.wsOpened}/${clients.length}`);
  console.log(`websocket errors: ${metrics.wsErrors}`);
  console.log(`websocket parse errors: ${metrics.wsParseErrors}`);
  console.log(`messages received: ${metrics.wsMessages}`);
  console.log(`answers sent: ${metrics.answersSent}`);
  console.log(`max players seen: ${metrics.maxPlayersSeen}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
