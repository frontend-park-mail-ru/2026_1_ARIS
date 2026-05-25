import type { GameRoom } from "../../../api/games";
import type { GamesPageState } from "../state/store";

export type HandleGamesProfileNavigationClickOptions = {
  room: GameRoom | null;
  setGamesOverlayState: (patch: Partial<GamesPageState>) => void;
  navigateToConfirmedProfile: () => void;
  openProfileNavigationConfirm: (link: HTMLAnchorElement) => void;
};

/**
 * Обрабатывает click-события подтверждения перехода в профиль из активной игры.
 */
export function handleGamesProfileNavigationClick(
  event: Event,
  target: Element,
  options: HandleGamesProfileNavigationClickOptions,
): boolean {
  const profileNavigationModal = target.closest("[data-games-profile-nav-modal]");
  if (
    target.closest("[data-games-profile-nav-close]") ||
    (profileNavigationModal instanceof HTMLElement && profileNavigationModal === target)
  ) {
    event.preventDefault();
    options.setGamesOverlayState({ profileNavigationConfirm: null });
    return true;
  }

  if (target.closest("[data-games-profile-nav-confirm]")) {
    event.preventDefault();
    options.navigateToConfirmedProfile();
    return true;
  }

  const protectedProfileLink = target.closest("[data-games-profile-link]");
  if (
    protectedProfileLink instanceof HTMLAnchorElement &&
    options.room &&
    options.room.status !== "waiting"
  ) {
    event.preventDefault();
    event.stopPropagation();
    options.openProfileNavigationConfirm(protectedProfileLink);
    return true;
  }

  return false;
}
