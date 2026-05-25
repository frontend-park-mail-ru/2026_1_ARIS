import { closeGamesMenus } from "../../render/floating-menu";
import { getPlayerFullName } from "../../room/profile/players";
import { createProfileNavigationActions } from "../profile-navigation-actions";
import type { GamesPageActionHandlersOptions } from "./types";

/**
 * Создаёт handlers подтверждения перехода в профиль игрока.
 */
export function createPageProfileNavigationActions(options: GamesPageActionHandlersOptions) {
  const getRoom = () => options.getState().room;

  return createProfileNavigationActions({
    getRoom,
    getConfirmedHref: () => options.getState().profileNavigationConfirm?.href,
    getPlayerFullName,
    getPlayerAvatarUrl: options.getPlayerAvatarUrl,
    closeMenus: closeGamesMenus,
    setGamesOverlayState: options.setGamesOverlayState,
    pushState: (href) => window.history.pushState({}, "", href),
    dispatchPopState: () => window.dispatchEvent(new PopStateEvent("popstate")),
  });
}
