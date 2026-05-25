import type { GameRoom } from "../../../api/games";
import type { GamesPageState } from "../state/store";
import {
  navigateToConfirmedProfileAction,
  openProfileNavigationConfirmFromLink,
} from "./profile-navigation";

type SetGamesOverlayState = (patch: Partial<GamesPageState>) => void;

export type ProfileNavigationActionsOptions = {
  getRoom: () => GameRoom | null;
  getConfirmedHref: () => string | undefined;
  getPlayerFullName: (player: GameRoom["players"][number]) => string;
  getPlayerAvatarUrl: (player: GameRoom["players"][number]) => string;
  closeMenus: () => Partial<GamesPageState>;
  setGamesOverlayState: SetGamesOverlayState;
  pushState: (href: string) => void;
  dispatchPopState: () => void;
};

/**
 * Создаёт фасад подтверждённой навигации в профиль игрока.
 */
export function createProfileNavigationActions(options: ProfileNavigationActionsOptions) {
  /**
   * Открывает confirm-overlay перехода в профиль из защищённой ссылки.
   */
  function openProfileNavigationConfirm(link: HTMLAnchorElement): void {
    openProfileNavigationConfirmFromLink(link, {
      room: options.getRoom(),
      getPlayerFullName: options.getPlayerFullName,
      getPlayerAvatarUrl: options.getPlayerAvatarUrl,
      closeMenus: options.closeMenus,
      setGamesOverlayState: options.setGamesOverlayState,
    });
  }

  /**
   * Подтверждает переход в профиль и синхронизирует router.
   */
  function navigateToConfirmedProfile(): void {
    navigateToConfirmedProfileAction({
      href: options.getConfirmedHref(),
      setGamesOverlayState: options.setGamesOverlayState,
      pushState: options.pushState,
      dispatchPopState: options.dispatchPopState,
    });
  }

  return {
    openProfileNavigationConfirm,
    navigateToConfirmedProfile,
  };
}
