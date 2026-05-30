import type { GamePlayer } from "./types";
import { gameT } from "../../shared/i18n";

/** Возвращает короткое имя игрока для сортировок и таблиц раунда. */
export function getRoundPlayerLabel(player: GamePlayer | null | undefined): string {
  if (!player) return gameT("common.playerFallback");
  const firstName = player.firstName?.trim();
  if (firstName) return firstName;

  const fullName = player.name.trim();
  if (fullName) return fullName.split(/\s+/)[0] || fullName;

  return player.username || gameT("common.playerFallback");
}
