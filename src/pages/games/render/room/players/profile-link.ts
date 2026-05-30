import { escapeHtml, renderAvatarMarkup } from "../../../../../utils/avatar";
import { gameT } from "../../../shared/i18n";
import type { GamePlayer, PlayerAvatarResolver, RenderGameProfileLinkOptions } from "./types";

/**
 * Возвращает href профиля игрока для внутренних ссылок.
 */
export function getRoomAuthorHref(profileId: string): string {
  return profileId ? `/id${encodeURIComponent(profileId)}` : "/profile";
}

/**
 * Рендерит защищённую ссылку на профиль с данными для подтверждения навигации.
 */
export function renderProtectedGameProfileLink(options: RenderGameProfileLinkOptions): string {
  const href = getRoomAuthorHref(options.profileId);
  const avatarAttribute = options.avatarUrl
    ? ` data-games-profile-avatar="${escapeHtml(options.avatarUrl)}"`
    : "";
  const ariaAttribute = options.ariaLabel ? ` aria-label="${escapeHtml(options.ariaLabel)}"` : "";

  return `
    <a
      href="${href}"
      class="${escapeHtml(options.className)}"
      data-link
      data-games-profile-link
      data-games-profile-id="${escapeHtml(options.profileId)}"
      data-games-profile-name="${escapeHtml(options.label)}"
      ${avatarAttribute}
      ${ariaAttribute}
    >${options.content}</a>
  `;
}

/**
 * Рендерит компактную ссылку игрока с аватаром.
 */
export function renderPlayerProfileLink(
  player: GamePlayer,
  getPlayerAvatarUrl: PlayerAvatarResolver,
): string {
  const playerName = player.name || player.username || gameT("common.playerFallback");

  return `
    <a href="${getRoomAuthorHref(player.profileId)}" class="games-player-profile" data-link>
      ${renderAvatarMarkup("games-player-profile__avatar", playerName, getPlayerAvatarUrl(player), {
        width: 40,
        height: 40,
      })}
      <span class="games-player-profile__name">${escapeHtml(playerName)}</span>
    </a>
  `;
}
