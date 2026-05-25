import type { GameRoom } from "../../../../../api/games";

/**
 * Возвращает полное имя игрока для системных сообщений.
 */
export function getSystemPlayerFullName(
  player: GameRoom["players"][number] | null | undefined,
): string {
  if (!player) return "Игрок";
  const firstName = player.firstName?.trim();
  const lastName = player.lastName?.trim();
  const fullFromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullFromParts) return fullFromParts;

  const fullName = player.name.trim();
  if (fullName) return fullName;

  return player.username || "Игрок";
}
