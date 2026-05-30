import { apiRequest } from "../core/client";
import { extractRoomResponse } from "./mappers";
import type { GameRoom } from "./types";

const PUBLIC_GUEST_STORAGE_PREFIX = "arisfront:public-game-guest:";

export type PublicGameGuestSession = {
  inviteCode: string;
  roomId: string;
  token: string;
};

export type JoinPublicGameRoomPayload = {
  firstName: string;
  lastName: string;
};

export type CreatePublicGameRoomPayload = {
  answerTimeoutSec: number;
  roundPauseSec: number;
};

export type JoinPublicGameRoomResult = {
  token: string;
  room: GameRoom;
};

function normaliseInviteCode(inviteCode: string): string {
  return inviteCode.trim().toUpperCase();
}

function storageKey(value: string): string {
  return `${PUBLIC_GUEST_STORAGE_PREFIX}${value}`;
}

function readPublicGuestSession(key: string): PublicGameGuestSession | null {
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PublicGameGuestSession>;
    const inviteCode = String(parsed.inviteCode ?? "").trim();
    const roomId = String(parsed.roomId ?? "").trim();
    const token = String(parsed.token ?? "").trim();
    if (!inviteCode || !roomId || !token) return null;
    return { inviteCode, roomId, token };
  } catch {
    return null;
  }
}

export function buildPublicGameRoomUrl(inviteCode: string): string {
  return `${window.location.origin}/games/public/${encodeURIComponent(normaliseInviteCode(inviteCode))}`;
}

export function rememberPublicGameGuestSession(session: PublicGameGuestSession): void {
  const normalized = {
    inviteCode: normaliseInviteCode(session.inviteCode),
    roomId: session.roomId.trim(),
    token: session.token.trim(),
  };
  if (!normalized.inviteCode || !normalized.roomId || !normalized.token) return;

  const value = JSON.stringify(normalized);
  window.localStorage.setItem(storageKey(normalized.inviteCode), value);
  window.localStorage.setItem(storageKey(normalized.roomId), value);
}

export function forgetPublicGameGuestSession(session: PublicGameGuestSession): void {
  window.localStorage.removeItem(storageKey(normaliseInviteCode(session.inviteCode)));
  window.localStorage.removeItem(storageKey(session.roomId));
}

export function getPublicGameGuestSessionByInvite(
  inviteCode: string,
): PublicGameGuestSession | null {
  return readPublicGuestSession(normaliseInviteCode(inviteCode));
}

export function getPublicGameGuestSessionByRoom(roomId: string): PublicGameGuestSession | null {
  return readPublicGuestSession(roomId.trim());
}

function publicTokenHeaders(token: string): Record<string, string> {
  return { "X-Game-Guest-Token": token };
}

export async function createPublicGameRoom(
  payload: CreatePublicGameRoomPayload = { answerTimeoutSec: 10, roundPauseSec: 14 },
): Promise<GameRoom> {
  return extractRoomResponse(
    await apiRequest<unknown>("/api/games/public-rooms", { method: "POST", body: payload }, {}),
  );
}

export async function joinPublicGameRoom(
  inviteCode: string,
  payload: JoinPublicGameRoomPayload,
): Promise<JoinPublicGameRoomResult> {
  const data = await apiRequest<Record<string, unknown>>(
    `/api/games/public-rooms/${encodeURIComponent(normaliseInviteCode(inviteCode))}/join`,
    { method: "POST", body: payload },
    {},
  );
  return {
    token: String(data.token ?? ""),
    room: extractRoomResponse(data.room ?? data),
  };
}

export async function getPublicGameRoom(
  roomId: string,
  token: string,
  signal?: AbortSignal,
): Promise<GameRoom> {
  return extractRoomResponse(
    await apiRequest<unknown>(
      `/api/games/public-rooms/${encodeURIComponent(roomId)}`,
      { cache: "no-store", headers: publicTokenHeaders(token), ...(signal ? { signal } : {}) },
      {},
    ),
  );
}

export async function submitPublicGameAnswer(
  roomId: string,
  token: string,
  answer: number,
): Promise<GameRoom | null> {
  return extractRoomResponse(
    await apiRequest<unknown>(
      `/api/games/public-rooms/${encodeURIComponent(roomId)}/answers`,
      { method: "POST", body: { answer }, headers: publicTokenHeaders(token) },
      {},
    ),
  );
}
