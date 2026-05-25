import type { GameRoom } from "../../../../api/games";

/** Возвращает короткое имя игрока для компактных игровых поверхностей. */
export function getPlayerShortName(player: GameRoom["players"][number] | null | undefined): string {
  if (!player) return "Игрок";
  const firstName = player.firstName?.trim();
  if (firstName) return firstName;

  const fullName = player.name.trim();
  if (fullName) return fullName.split(/\s+/)[0] || fullName;

  return player.username || "Игрок";
}

/** Возвращает полное имя игрока для профилей, рейтинга и результатов. */
export function getPlayerFullName(player: GameRoom["players"][number] | null | undefined): string {
  if (!player) return "Игрок";
  const firstName = player.firstName?.trim();
  const lastName = player.lastName?.trim();
  const fullFromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullFromParts) return fullFromParts;

  const fullName = player.name.trim();
  if (fullName) return fullName;

  return player.username || "Игрок";
}

/** Возвращает подпись игрока для самой игровой сцены. */
export function getGamePlayerLabel(player: GameRoom["players"][number] | null | undefined): string {
  return getPlayerShortName(player);
}

/** Возвращает короткое имя игрока по profileId внутри комнаты. */
export function getPlayerName(room: GameRoom | null, profileId: string): string {
  if (!profileId) return "Игрок";
  return getPlayerShortName(room?.players.find((player) => player.profileId === profileId));
}

/** Возвращает полное имя игрока по profileId внутри комнаты. */
export function getPlayerFullNameByProfile(room: GameRoom | null, profileId: string): string {
  if (!profileId) return "Игрок";
  return getPlayerFullName(room?.players.find((player) => player.profileId === profileId));
}
