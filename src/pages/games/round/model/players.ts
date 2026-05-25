import type { GamePlayer } from "./types";

/** Возвращает короткое имя игрока для сортировок и таблиц раунда. */
export function getRoundPlayerLabel(player: GamePlayer | null | undefined): string {
  if (!player) return "Игрок";
  const firstName = player.firstName?.trim();
  if (firstName) return firstName;

  const fullName = player.name.trim();
  if (fullName) return fullName.split(/\s+/)[0] || fullName;

  return player.username || "Игрок";
}
