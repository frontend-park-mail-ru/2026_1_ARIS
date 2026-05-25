import type { GameRoom } from "../../../../../api/games";
import { getPlayerGender } from "./gender";
import { getSystemPlayerFullName } from "./names";

/**
 * Возвращает глагол для смены статуса готовности.
 */
export function getReadyVerb(player: GameRoom["players"][number] | null | undefined): string {
  const gender = getPlayerGender(player);
  if (gender === "male") return "поставил";
  if (gender === "female") return "поставила";
  return "поставил(а)";
}

/**
 * Возвращает глагол для входа игрока в комнату.
 */
export function getJoinedVerb(player: GameRoom["players"][number] | null | undefined): string {
  const gender = getPlayerGender(player);
  if (gender === "male") return "присоединился";
  if (gender === "female") return "присоединилась";
  return "присоединился(ась)";
}

/**
 * Возвращает глагол для выхода игрока из комнаты.
 */
export function getLeftVerb(player: GameRoom["players"][number] | null | undefined): string {
  const gender = getPlayerGender(player);
  if (gender === "male") return "вышел";
  if (gender === "female") return "вышла";
  return "вышел(ла)";
}

/**
 * Возвращает подпись игрока для сообщений входа и выхода.
 */
export function getRoomJoinLeavePlayerLabel(player: GameRoom["players"][number]): string {
  return getSystemPlayerFullName(player) || "Игрок";
}

/**
 * Возвращает глагол для удаления игрока из комнаты.
 */
export function getRemovedVerb(player: GameRoom["players"][number] | null | undefined): string {
  const gender = getPlayerGender(player);
  if (gender === "male") return "был удален";
  if (gender === "female") return "была удалена";
  return "был(а) удален(а)";
}

/**
 * Возвращает глагол для назначения нового администратора.
 */
export function getAssignedAdminVerb(
  player: GameRoom["players"][number] | null | undefined,
): string {
  const gender = getPlayerGender(player);
  if (gender === "male") return "назначил";
  if (gender === "female") return "назначила";
  return "назначил(а)";
}

/**
 * Форматирует тип комнаты для пользовательских сообщений.
 */
export function formatRoomModeLabel(isRanked: boolean): string {
  return isRanked ? "Рейтинговая" : "Обычная";
}
