/**
 * API для игрового микросервиса.
 *
 * Сейчас поддерживает числовую дуэль: комнаты, live-состояние через WebSocket,
 * историю и статистику.
 */
import { apiRequest } from "./core/client";
import { getSessionUser } from "../state/session";

export type GameType = "number_duel";
export type GameRoomStatus = "waiting" | "active" | "finished";

export type GamePlayer = {
  profileId: string;
  name: string;
  score: number;
  hasAnswered: boolean;
};

export type GameAnswer = {
  profileId: string;
  answer: number | null;
  distance: number | null;
  isWinner: boolean;
};

export type GameRoundQuestion = {
  id: string;
  text: string;
  correctAnswer: number | null;
  answerUnit: string;
  answers: GameAnswer[];
  winnerProfileId: string;
};

export type CurrentGameQuestion = {
  id: string;
  text: string;
  deadlineAt: string;
  hasAnswered: boolean;
  answerUnit: string;
};

export type GameStats = {
  played: number;
  won: number;
  lost: number;
  drawn: number;
};

export type GameRoom = {
  id: string;
  inviteCode: string;
  gameType: GameType;
  status: GameRoomStatus;
  questionCount: number;
  answerTimeoutSec: number;
  players: GamePlayer[];
  currentQuestion: CurrentGameQuestion | null;
  questions: GameRoundQuestion[];
  winnerProfileId: string;
  profileStats: GameStats | null;
};

export type CreateGameRoomPayload = {
  questionCount: number;
  answerTimeoutSec: number;
  gameType: GameType;
};

export type GameHistoryItem = {
  id: string;
  roomId: string;
  opponentName: string;
  result: "win" | "loss" | "draw" | "unknown";
  score: string;
  myScore: number;
  opponentScore: number;
  createdAt: string;
};

export type GameRoomSocketHandlers = {
  onRoom: (room: GameRoom) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
};

export type GameRoomSocketSubscription = {
  sendAnswer: (answer: number) => boolean;
  isOpen: () => boolean;
  close: () => void;
};

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" ? (value as RawRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toStringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

function normaliseStatus(value: unknown): GameRoomStatus {
  return value === "active" || value === "finished" || value === "waiting" ? value : "waiting";
}

function getFirstString(raw: RawRecord, keys: string[]): string {
  for (const key of keys) {
    const value = toStringValue(raw[key]);
    if (value) return value;
  }
  return "";
}

function mapGamePlayer(value: unknown): GamePlayer {
  const raw = asRecord(value);
  const firstName = getFirstString(raw, ["firstName", "FirstName"]);
  const lastName = getFirstString(raw, ["lastName", "LastName"]);
  const login = getFirstString(raw, ["login", "username", "name", "displayName"]);
  const name = `${firstName} ${lastName}`.trim() || login || "Игрок";

  return {
    profileId: getFirstString(raw, ["profileId", "profileID", "ProfileID", "id", "ID"]),
    name,
    score: toNumber(raw.score ?? raw.Score),
    hasAnswered: toBoolean(raw.hasAnswered ?? raw.HasAnswered),
  };
}

function mapCurrentQuestion(value: unknown): CurrentGameQuestion | null {
  const raw = asRecord(value);
  const text = getFirstString(raw, ["text", "Text"]);
  if (!text) return null;

  return {
    id: getFirstString(raw, ["id", "ID", "questionId", "questionID"]),
    text,
    deadlineAt: getFirstString(raw, ["deadlineAt", "DeadlineAt"]),
    hasAnswered: toBoolean(raw.hasAnswered ?? raw.HasAnswered),
    answerUnit: getFirstString(raw, ["answerUnit", "AnswerUnit"]),
  };
}

function mapGameAnswer(value: unknown, profileIdFallback = ""): GameAnswer {
  const raw = asRecord(value);
  const answerValue = raw.answer ?? raw.Answer;
  const distanceValue = raw.distance ?? raw.Distance;

  return {
    profileId:
      getFirstString(raw, ["profileId", "profileID", "ProfileID", "playerId", "playerID"]) ||
      profileIdFallback,
    answer: answerValue === null || answerValue === undefined ? null : toNumber(answerValue),
    distance:
      distanceValue === null || distanceValue === undefined ? null : toNumber(distanceValue),
    isWinner: toBoolean(raw.isWinner ?? raw.IsWinner),
  };
}

function mapGameAnswers(value: unknown): GameAnswer[] {
  if (Array.isArray(value)) {
    return value.map((item) => mapGameAnswer(item)).filter((answer) => answer.profileId);
  }

  const raw = asRecord(value);
  return Object.entries(raw)
    .map(([profileId, answer]) => {
      if (answer && typeof answer === "object") {
        return mapGameAnswer(answer, profileId);
      }
      return {
        profileId,
        answer: answer === null || answer === undefined ? null : toNumber(answer),
        distance: null,
        isWinner: false,
      };
    })
    .filter((answer) => answer.profileId);
}

function mapRoundQuestion(value: unknown): GameRoundQuestion {
  const raw = asRecord(value);
  const correctAnswer = raw.correctAnswer ?? raw.CorrectAnswer;

  return {
    id: getFirstString(raw, ["id", "ID", "questionId", "questionID"]),
    text: getFirstString(raw, ["text", "Text"]),
    correctAnswer:
      correctAnswer === null || correctAnswer === undefined ? null : toNumber(correctAnswer),
    answerUnit: getFirstString(raw, ["answerUnit", "AnswerUnit"]),
    answers: mapGameAnswers(raw.answers ?? raw.Answers),
    winnerProfileId: getFirstString(raw, ["winnerProfileId", "winnerProfileID", "WinnerProfileID"]),
  };
}

function mapRoom(value: unknown): GameRoom {
  const raw = asRecord(value);

  return {
    id: getFirstString(raw, ["id", "ID", "roomId", "roomID"]),
    inviteCode: getFirstString(raw, ["inviteCode", "InviteCode"]),
    gameType: "number_duel",
    status: normaliseStatus(raw.status ?? raw.Status),
    questionCount: toNumber(raw.questionCount ?? raw.QuestionCount, 5),
    answerTimeoutSec: toNumber(raw.answerTimeoutSec ?? raw.AnswerTimeoutSec, 10),
    players: asArray(raw.players ?? raw.Players)
      .map(mapGamePlayer)
      .filter((player) => player.profileId),
    currentQuestion: mapCurrentQuestion(raw.currentQuestion ?? raw.CurrentQuestion),
    questions: asArray(raw.questions ?? raw.Questions).map(mapRoundQuestion),
    winnerProfileId: getFirstString(raw, ["winnerProfileId", "winnerProfileID", "WinnerProfileID"]),
    profileStats:
      raw.profileStats || raw.ProfileStats ? mapStats(raw.profileStats ?? raw.ProfileStats) : null,
  };
}

function mapHistoryItem(value: unknown): GameHistoryItem {
  const raw = asRecord(value);
  const room = mapRoom(raw.room ?? raw.Room ?? {});
  const myScore = toNumber(raw.myScore ?? raw.MyScore);
  const opponentScore = toNumber(raw.opponentScore ?? raw.OpponentScore);
  const result =
    myScore > opponentScore
      ? "win"
      : myScore < opponentScore
        ? "loss"
        : raw.result === "draw"
          ? "draw"
          : myScore === opponentScore
            ? "draw"
            : "unknown";
  const currentProfileId = String(getSessionUser()?.id ?? "");
  const opponentByScore = room.players.find(
    (player) => player.score === opponentScore && myScore !== opponentScore,
  );
  const opponent =
    opponentByScore?.name ||
    room.players.find((player) => player.profileId !== currentProfileId)?.name ||
    getFirstString(raw, ["opponentName", "opponent", "OpponentName"]) ||
    "Соперник";

  return {
    id: getFirstString(raw, ["id", "ID"]) || room.id,
    roomId: room.id || getFirstString(raw, ["roomId", "roomID"]),
    opponentName: opponent,
    result,
    score: `${myScore}:${opponentScore}`,
    myScore,
    opponentScore,
    createdAt:
      getFirstString(raw, ["createdAt", "CreatedAt", "finishedAt", "FinishedAt"]) ||
      getFirstString(asRecord(raw.room ?? raw.Room), [
        "finishedAt",
        "FinishedAt",
        "createdAt",
        "CreatedAt",
      ]),
  };
}

function mapStats(value: unknown): GameStats {
  const raw = asRecord(value);
  const won = toNumber(raw.won ?? raw.Won ?? raw.wins ?? raw.Wins);
  const lost = toNumber(raw.lost ?? raw.Lost ?? raw.losses ?? raw.Losses);
  const drawn = toNumber(raw.drawn ?? raw.Drawn ?? raw.draws ?? raw.Draws);
  const played = toNumber(
    raw.played ?? raw.Played ?? raw.gamesPlayed ?? raw.GamesPlayed,
    won + lost + drawn,
  );

  return { played, won, lost, drawn };
}

function extractRoomResponse(value: unknown): GameRoom {
  const raw = asRecord(value);
  return mapRoom(raw.room ?? raw.Room ?? value);
}

export async function createGameRoom(payload: CreateGameRoomPayload): Promise<GameRoom> {
  return extractRoomResponse(
    await apiRequest<unknown>("/api/games/rooms", { method: "POST", body: payload }, {}),
  );
}

export async function joinGameRoom(inviteCode: string): Promise<GameRoom> {
  return extractRoomResponse(
    await apiRequest<unknown>(
      "/api/games/rooms/join",
      { method: "POST", body: { inviteCode } },
      {},
    ),
  );
}

export async function getGameRooms(signal?: AbortSignal): Promise<GameRoom[]> {
  const data = await apiRequest<unknown>("/api/games/rooms", { ...(signal ? { signal } : {}) }, []);
  const raw = asRecord(data);
  const rooms = Array.isArray(data) ? data : asArray(raw.rooms ?? raw.Rooms);
  return rooms.map(mapRoom).filter((room) => room.id);
}

export async function getGameRoom(roomId: string, signal?: AbortSignal): Promise<GameRoom> {
  return extractRoomResponse(
    await apiRequest<unknown>(
      `/api/games/rooms/${encodeURIComponent(roomId)}`,
      { ...(signal ? { signal } : {}) },
      {},
    ),
  );
}

export async function startGameRoom(roomId: string): Promise<GameRoom> {
  return extractRoomResponse(
    await apiRequest<unknown>(
      `/api/games/rooms/${encodeURIComponent(roomId)}/start`,
      { method: "POST" },
      {},
    ),
  );
}

export async function submitGameAnswer(roomId: string, answer: number): Promise<GameRoom | null> {
  const data = await apiRequest<unknown>(
    `/api/games/rooms/${encodeURIComponent(roomId)}/answers`,
    { method: "POST", body: { answer } },
    {},
  );
  const raw = asRecord(data);
  return raw.room || raw.Room ? extractRoomResponse(data) : null;
}

export async function getGameHistory(signal?: AbortSignal): Promise<GameHistoryItem[]> {
  const data = await apiRequest<unknown>(
    "/api/games/history",
    { ...(signal ? { signal } : {}) },
    [],
  );
  const raw = asRecord(data);
  const history = Array.isArray(data) ? data : asArray(raw.history ?? raw.items ?? raw.History);
  return history.map(mapHistoryItem).filter((item) => item.id || item.roomId);
}

export async function getGameStats(signal?: AbortSignal): Promise<GameStats> {
  return mapStats(
    await apiRequest<unknown>("/api/games/stats", { ...(signal ? { signal } : {}) }, {}),
  );
}

function getGameSocketUrl(roomId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/games/${encodeURIComponent(roomId)}`;
}

export function subscribeToGameRoom(
  roomId: string,
  handlers: GameRoomSocketHandlers,
): GameRoomSocketSubscription {
  if (!getSessionUser()) {
    return {
      sendAnswer: () => false,
      isOpen: () => false,
      close: () => {},
    };
  }

  let socket: WebSocket | null = null;
  let retries = 0;
  let intentionalClose = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect(): void {
    if (intentionalClose) return;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    socket = new WebSocket(getGameSocketUrl(roomId));

    socket.addEventListener("message", (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as RawRecord;
        if (payload.type === "room_state" || payload.room || payload.Room) {
          handlers.onRoom(extractRoomResponse(payload));
        }
      } catch (error) {
        console.error("[games] failed to parse websocket message", error);
      }
    });

    socket.addEventListener("open", () => {
      retries = 0;
      handlers.onOpen?.();
    });

    socket.addEventListener("error", () => {
      handlers.onError?.();
    });

    socket.addEventListener("close", () => {
      handlers.onClose?.();
      if (intentionalClose) return;
      const delay = Math.min(1000 * 2 ** retries, 15_000) + Math.random() * 400;
      retries += 1;
      reconnectTimer = setTimeout(connect, delay);
    });
  }

  connect();

  return {
    sendAnswer: (answer: number): boolean => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return false;
      socket.send(JSON.stringify({ type: "submit_answer", answer }));
      return true;
    },
    isOpen: (): boolean => Boolean(socket && socket.readyState === WebSocket.OPEN),
    close: (): void => {
      intentionalClose = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (
        socket &&
        (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
      ) {
        socket.close();
      }
    },
  };
}
