import type { GamePlayerGender, GameRoom } from "../../../../../api/games";
import { isPublicGuestPlayer } from "../public-guest";
import { getSystemPlayerFullName } from "./names";

/**
 * Нормализует пол игрока из backend/profile payload.
 */
export function normalizeGamePlayerGender(value: unknown): GamePlayerGender {
  const gender = String(value ?? "")
    .trim()
    .toLowerCase();
  if (gender === "male" || gender === "мужской" || gender === "m" || gender === "1") {
    return "male";
  }
  if (gender === "female" || gender === "женский" || gender === "f" || gender === "2") {
    return "female";
  }
  return "";
}

/**
 * Извлекает пол игрока из произвольного profile payload.
 */
export function getProfileGender(profile: unknown): GamePlayerGender {
  if (!profile || typeof profile !== "object") return "";
  const raw = profile as Record<string, unknown>;
  return normalizeGamePlayerGender(raw.gender ?? raw.Gender ?? raw.sex ?? raw.Sex);
}

/**
 * Определяет вероятный пол по первому имени для русских системных фраз.
 */
export function inferGenderByFirstName(firstNameValue: string): GamePlayerGender {
  const firstName = firstNameValue.trim().toLowerCase();
  if (!firstName) return "";

  const masculineAEndingNames = new Set(["илья", "никита", "кузьма", "фома", "лука", "савва"]);
  if (masculineAEndingNames.has(firstName)) return "male";

  if (/[ая]$/.test(firstName)) return "female";
  if (/[йрнлтмвсдгкпбзжчшщхфц]$/.test(firstName)) return "male";
  return "";
}

/**
 * Определяет вероятный пол игрока по firstName или первому слову полного имени.
 */
export function inferPlayerGenderByName(
  player: GameRoom["players"][number] | null | undefined,
): GamePlayerGender {
  return inferGenderByFirstName(
    String(player?.firstName || getSystemPlayerFullName(player).split(/\s+/)[0] || ""),
  );
}

/**
 * Возвращает пол игрока с fallback на эвристику по имени.
 */
export function getPlayerGender(
  player: GameRoom["players"][number] | null | undefined,
): GamePlayerGender {
  if (!player) return "";
  if (isPublicGuestPlayer(player)) return "male";
  return normalizeGamePlayerGender(player.gender) || inferPlayerGenderByName(player);
}
