import type { GameRoom } from "../../../../api/games";
import { escapeHtml } from "../../../../utils/avatar";
import { areRoomPlayersReady, getRoomMaxPlayers } from "../../room/selectors";

export type RenderParticipantsStatusOptions = {
  room: GameRoom;
  hintOpen: boolean;
};

export type RenderReadyPlayersStatusOptions = {
  room: GameRoom;
  hintOpen: boolean;
};

/**
 * Форматирует счётчик участников комнаты.
 */
export function formatParticipants(room: GameRoom): string {
  return `Участников в комнате: ${room.players.length}/${getRoomMaxPlayers(room)}`;
}

/**
 * Рендерит статус минимального числа участников.
 */
export function renderParticipantsStatus(options: RenderParticipantsStatusOptions): string {
  const { room, hintOpen } = options;
  const hasEnoughPlayers = room.players.length >= 2;
  const hintText = "Минимум: 2 игрока";

  return `
    <span class="games-ready-status">
      <span>${escapeHtml(formatParticipants(room))}</span>
      <span
        class="games-ready-status__hint${hintOpen ? " games-ready-status__hint--open" : ""}"
        data-games-participants-status
      >
        <button
          type="button"
          class="games-ready-status__button games-ready-status__button--${hasEnoughPlayers ? "ready" : "not-ready"}"
          data-games-participants-status-toggle
          aria-label="${hintText}"
          aria-expanded="${hintOpen ? "true" : "false"}"
        >
          ${hasEnoughPlayers ? "✓" : "✕"}
        </button>
        <span
          class="games-ready-status__popover games-ready-status__popover--compact"
          aria-hidden="${hintOpen ? "false" : "true"}"
        >
          ${hintText}
        </span>
      </span>
    </span>
  `;
}

/**
 * Форматирует счётчик готовых игроков.
 */
export function formatReadyPlayers(room: GameRoom): string {
  const readyCount = room.players.filter((player) => player.isReady).length;
  return `Готовы: ${readyCount}/${room.players.length}`;
}

/**
 * Рендерит статус готовности игроков.
 */
export function renderReadyPlayersStatus(options: RenderReadyPlayersStatusOptions): string {
  const { room, hintOpen } = options;
  const allPlayersReady = areRoomPlayersReady(room);
  const hintText = allPlayersReady
    ? "Все игроки готовы к игре"
    : "Один или несколько игроков не готовы к игре";

  return `
    <span class="games-ready-status">
      <span>${escapeHtml(formatReadyPlayers(room))}</span>
      <span
        class="games-ready-status__hint${hintOpen ? " games-ready-status__hint--open" : ""}"
        data-games-ready-status
      >
        <button
          type="button"
          class="games-ready-status__button games-ready-status__button--${allPlayersReady ? "ready" : "not-ready"}"
          data-games-ready-status-toggle
          aria-label="${escapeHtml(hintText)}"
          aria-expanded="${hintOpen ? "true" : "false"}"
        >
          ${allPlayersReady ? "✓" : "✕"}
        </button>
        <span
          class="games-ready-status__popover${allPlayersReady ? " games-ready-status__popover--compact" : ""}"
          aria-hidden="${hintOpen ? "false" : "true"}"
        >
          ${escapeHtml(hintText)}
        </span>
      </span>
    </span>
  `;
}
