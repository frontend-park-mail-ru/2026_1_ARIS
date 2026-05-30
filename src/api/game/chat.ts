/**
 * API чата игровой комнаты.
 *
 * Загружает историю сообщений комнаты и отправляет новые сообщения.
 */
import { apiRequest } from "../core/client";
import type { GameRoomMessage } from "./types";
import { asArray, asRecord, extractRoomMessageResponse, mapRoomMessage } from "./mappers";
import { getPublicGameGuestSessionByRoom } from "./public-room";

function buildRoomMessagesQuery(
  options: {
    limit?: number;
    offset?: number;
    after?: number | string;
  } = {},
): string {
  const params = new URLSearchParams();
  if (typeof options.limit === "number") params.set("limit", String(options.limit));
  if (typeof options.offset === "number") params.set("offset", String(options.offset));
  if (options.after !== undefined && options.after !== "")
    params.set("after", String(options.after));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getGameRoomMessages(
  roomId: string,
  options: { limit?: number; offset?: number; after?: number | string; signal?: AbortSignal } = {},
): Promise<GameRoomMessage[]> {
  const publicSession = getPublicGameGuestSessionByRoom(roomId);
  const path = publicSession
    ? `/api/games/public-rooms/${encodeURIComponent(roomId)}/messages`
    : `/api/games/rooms/${encodeURIComponent(roomId)}/messages`;
  const data = await apiRequest<unknown>(
    `${path}${buildRoomMessagesQuery(options)}`,
    {
      cache: "no-store",
      ...(publicSession ? { headers: { "X-Game-Guest-Token": publicSession.token } } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    },
    [],
  );
  const raw = asRecord(data);
  const messages = Array.isArray(data) ? data : asArray(raw.messages ?? raw.Messages);
  return messages.map(mapRoomMessage).filter((message) => message.id);
}

export async function sendGameRoomMessage(roomId: string, text: string): Promise<GameRoomMessage> {
  const publicSession = getPublicGameGuestSessionByRoom(roomId);
  const path = publicSession
    ? `/api/games/public-rooms/${encodeURIComponent(roomId)}/messages`
    : `/api/games/rooms/${encodeURIComponent(roomId)}/messages`;
  return extractRoomMessageResponse(
    await apiRequest<unknown>(
      path,
      {
        method: "POST",
        body: { text },
        ...(publicSession ? { headers: { "X-Game-Guest-Token": publicSession.token } } : {}),
      },
      {},
    ),
  );
}
