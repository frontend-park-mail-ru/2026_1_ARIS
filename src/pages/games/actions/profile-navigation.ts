import type { GameRoom } from "../../../api/games";
import type { GameProfileNavigationConfirm, GamesPageState } from "../state/store";
import { gameT } from "../shared/i18n";

export type ProfileNavigationConfirmOptions = {
  room: GameRoom | null;
  getPlayerFullName: (player: GameRoom["players"][number]) => string;
  getPlayerAvatarUrl: (player: GameRoom["players"][number]) => string;
};

/**
 * Собирает данные подтверждения перехода в профиль из защищённой ссылки.
 */
export function getProfileNavigationConfirmFromLink(
  link: HTMLAnchorElement,
  options: ProfileNavigationConfirmOptions,
): GameProfileNavigationConfirm | null {
  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin) return null;
  const href = `${url.pathname}${url.search}${url.hash}`;
  const profileIdFromPath = /^\/id([^/?#]+)/.exec(url.pathname)?.[1] ?? "";
  const profileId = link.dataset.gamesProfileId || decodeURIComponent(profileIdFromPath);
  if (!profileId) return null;

  const player = options.room?.players.find((item) => item.profileId === profileId) ?? null;
  const name =
    link.dataset.gamesProfileName?.trim() ||
    (player ? options.getPlayerFullName(player) : "") ||
    link.textContent?.trim() ||
    gameT("common.userFallback");
  const avatarUrl =
    link.dataset.gamesProfileAvatar?.trim() || (player ? options.getPlayerAvatarUrl(player) : "");

  return { profileId, href, name, avatarUrl };
}

export type OpenProfileNavigationConfirmOptions = ProfileNavigationConfirmOptions & {
  closeMenus: () => Partial<GamesPageState>;
  setGamesOverlayState: (patch: Partial<GamesPageState>) => void;
};

/**
 * Открывает overlay подтверждения перехода в профиль игрока.
 */
export function openProfileNavigationConfirmFromLink(
  link: HTMLAnchorElement,
  options: OpenProfileNavigationConfirmOptions,
): void {
  const profileNavigationConfirm = getProfileNavigationConfirmFromLink(link, options);
  if (!profileNavigationConfirm) return;

  options.setGamesOverlayState({
    profileNavigationConfirm,
    ...options.closeMenus(),
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    reportConfirmQuestionKey: "",
    kickConfirmProfileId: "",
    adminConfirmProfileId: "",
    message: "",
    error: "",
    errorTarget: "",
  });
}

export type NavigateToConfirmedProfileOptions = {
  href: string | undefined;
  setGamesOverlayState: (patch: Partial<GamesPageState>) => void;
  pushState: (href: string) => void;
  dispatchPopState: () => void;
};

/**
 * Закрывает confirm-overlay и переходит в подтверждённый профиль.
 */
export function navigateToConfirmedProfileAction(options: NavigateToConfirmedProfileOptions): void {
  options.setGamesOverlayState({ profileNavigationConfirm: null });
  if (!options.href) return;
  options.pushState(options.href);
  options.dispatchPopState();
}
