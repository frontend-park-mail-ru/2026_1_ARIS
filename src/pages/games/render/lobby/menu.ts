import { escapeHtml } from "../../../../utils/avatar";
import { gameT } from "../../shared/i18n";
import type { GamesLobbyMode } from "../../state/store";

/** Рендерит кнопку возврата из подпредставления лобби. */
export function renderLobbyBackButton(): string {
  return `
    <button type="button" class="games-button games-button--ghost games-lobby-back" data-games-lobby-mode="menu">
      ${escapeHtml(gameT("lobby.back"))}
    </button>
  `;
}

/** Рендерит стартовое меню общего лобби выбранной игры. */
export function renderLobbyMenu(): string {
  const items: Array<{ mode: GamesLobbyMode; title: string; text: string }> = [
    {
      mode: "create",
      title: gameT("lobby.create"),
      text: gameT("lobby.createText"),
    },
    {
      mode: "rooms",
      title: gameT("lobby.rooms"),
      text: gameT("lobby.roomsText"),
    },
    {
      mode: "join",
      title: gameT("lobby.join"),
      text: gameT("lobby.joinText"),
    },
    {
      mode: "leaderboard",
      title: gameT("lobby.leaderboard"),
      text: gameT("lobby.leaderboardText"),
    },
  ];

  return `
    <div class="games-lobby-menu" aria-label="${escapeHtml(gameT("lobby.actionsAria"))}">
      ${items
        .map(
          (item) => `
            <button type="button" class="games-lobby-option" data-games-lobby-mode="${item.mode}">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.text)}</span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}
