/**
 * API комнат игрового микросервиса.
 *
 * Содержит команды создания, входа, управления комнатой и отправки ответа.
 */
import { apiRequest } from "../core/client";
import type { CreateGameRoomPayload, GameRoom, JoinGameRoomPayload } from "./types";
import { asArray, asRecord, extractRoomResponse, mapRoom } from "./mappers";
import {
  getPublicGameGuestSessionByRoom,
  getPublicGameRoom,
  submitPublicGameAnswer,
} from "./public-room";

export async function createGameRoom(payload: CreateGameRoomPayload): Promise<GameRoom> {
  return extractRoomResponse(
    await apiRequest<unknown>("/api/games/rooms", { method: "POST", body: payload }, {}),
  );
}

export async function joinGameRoom(input: string | JoinGameRoomPayload): Promise<GameRoom> {
  const payload =
    typeof input === "string"
      ? { inviteCode: input }
      : {
          ...(input.inviteCode ? { inviteCode: input.inviteCode } : {}),
          ...(input.roomId ? { roomId: input.roomId } : {}),
          ...(input.password ? { password: input.password } : {}),
        };

  return extractRoomResponse(
    await apiRequest<unknown>("/api/games/rooms/join", { method: "POST", body: payload }, {}),
  );
}

export async function getGameRooms(signal?: AbortSignal): Promise<GameRoom[]> {
  const data = await apiRequest<unknown>(
    "/api/games/rooms",
    { cache: "no-store", ...(signal ? { signal } : {}) },
    [],
  );
  const raw = asRecord(data);
  const rooms = Array.isArray(data) ? data : asArray(raw.rooms ?? raw.Rooms);
  return rooms.map(mapRoom).filter((room) => room.id);
}

export async function getGameRoom(roomId: string, signal?: AbortSignal): Promise<GameRoom> {
  const publicSession = getPublicGameGuestSessionByRoom(roomId);
  if (publicSession) {
    return getPublicGameRoom(roomId, publicSession.token, signal);
  }

  return extractRoomResponse(
    await apiRequest<unknown>(
      `/api/games/rooms/${encodeURIComponent(roomId)}`,
      { ...(signal ? { signal } : {}) },
      {},
    ),
  );
}

export async function disbandGameRoom(roomId: string): Promise<void> {
  await apiRequest<unknown>(
    `/api/games/rooms/${encodeURIComponent(roomId)}`,
    { method: "DELETE" },
    {},
  );
}

export async function leaveGameRoom(roomId: string): Promise<void> {
  await apiRequest<unknown>(
    `/api/games/rooms/${encodeURIComponent(roomId)}/members/me`,
    { method: "DELETE" },
    {},
  );
}

export async function setGameRoomReady(roomId: string, isReady: boolean): Promise<void> {
  await apiRequest<unknown>(
    `/api/games/rooms/${encodeURIComponent(roomId)}/ready`,
    { method: "PATCH", body: { isReady } },
    {},
  );
}

export async function setGameRoomReplay(roomId: string, isReady: boolean): Promise<GameRoom> {
  return extractRoomResponse(
    await apiRequest<unknown>(
      `/api/games/rooms/${encodeURIComponent(roomId)}/replay`,
      { method: "PATCH", body: { isReady } },
      {},
    ),
  );
}

export async function kickGameRoomPlayer(roomId: string, profileId: string): Promise<void> {
  await apiRequest<unknown>(
    `/api/games/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(profileId)}`,
    { method: "DELETE" },
    {},
  );
}

export async function updateGameRoomPassword(roomId: string, password: string): Promise<void> {
  await apiRequest<unknown>(
    `/api/games/rooms/${encodeURIComponent(roomId)}/password`,
    { method: "PATCH", body: { password } },
    {},
  );
}

export async function updateGameRoomTitle(roomId: string, title: string): Promise<void> {
  await apiRequest<unknown>(
    `/api/games/rooms/${encodeURIComponent(roomId)}/title`,
    { method: "PATCH", body: { title } },
    {},
  );
}

export async function updateGameRoomRanked(roomId: string, isRanked: boolean): Promise<void> {
  await apiRequest<unknown>(
    `/api/games/rooms/${encodeURIComponent(roomId)}/ranked`,
    { method: "PATCH", body: { isRanked } },
    {},
  );
}

export async function assignGameRoomAdmin(roomId: string, profileId: string): Promise<void> {
  await apiRequest<unknown>(
    `/api/games/rooms/${encodeURIComponent(roomId)}/admin`,
    { method: "PATCH", body: { profileId } },
    {},
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
  const publicSession = getPublicGameGuestSessionByRoom(roomId);
  if (publicSession) {
    return submitPublicGameAnswer(roomId, publicSession.token, answer);
  }

  const data = await apiRequest<unknown>(
    `/api/games/rooms/${encodeURIComponent(roomId)}/answers`,
    { method: "POST", body: { answer } },
    {},
  );
  const raw = asRecord(data);
  return raw.room || raw.Room ? extractRoomResponse(data) : null;
}

export async function pauseGameRoom(roomId: string): Promise<GameRoom> {
  return extractRoomResponse(
    await apiRequest<unknown>(
      `/api/games/rooms/${encodeURIComponent(roomId)}/pause`,
      { method: "POST" },
      {},
    ),
  );
}

export async function forceResumeGameRoom(roomId: string): Promise<GameRoom> {
  return extractRoomResponse(
    await apiRequest<unknown>(
      `/api/games/rooms/${encodeURIComponent(roomId)}/force-resume`,
      { method: "POST" },
      {},
    ),
  );
}
