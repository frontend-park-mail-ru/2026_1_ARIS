/**
 * API истории и рейтинга игр.
 *
 * Загружает статистику, историю матчей и таблицу лидеров текущего сезона.
 */
import { apiRequest } from "../core/client";
import type { GameHistoryItem, GameLeaderboard, GameStats, GameType } from "./types";
import { asArray, asRecord, mapHistoryItem, mapLeaderboard, mapStats } from "./mappers";

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

export async function getGameLeaderboard(
  gameType: GameType,
  signal?: AbortSignal,
): Promise<GameLeaderboard> {
  return mapLeaderboard(
    await apiRequest<unknown>(
      `/api/games/ratings/${encodeURIComponent(gameType)}/leaderboard`,
      { cache: "no-store", ...(signal ? { signal } : {}) },
      {},
    ),
  );
}
