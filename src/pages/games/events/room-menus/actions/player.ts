import { getAdminConfirmPatch, getKickConfirmPatch } from "../shared";
import type { HandleGamesRoomMenusClickOptions } from "../types";

/**
 * Обрабатывает action игрока из floating menu.
 */
export function handlePlayerFloatingMenuAction(
  action: string,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (action.startsWith("player-admin:")) {
    const profileId = action.slice("player-admin:".length);
    if (!profileId) return true;
    options.setGamesState(getAdminConfirmPatch(profileId, options.closeGamesMenus));
    return true;
  }

  if (action.startsWith("player-kick:")) {
    const profileId = action.slice("player-kick:".length);
    if (!profileId) return true;
    options.setGamesState(getKickConfirmPatch(profileId, options.closeGamesMenus));
    return true;
  }

  return false;
}
