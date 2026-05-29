import type { GameRoom } from "../../../../api/games";
import { domPatch } from "../../../../vdom/patch";
import { refreshGamesOverlayDom } from "./overlay";
import { syncGamesDomAfterRender } from "./sync";
import type { GamesDomRefreshOptions, GamesDomRefreshRoot } from "./types";

function escapeSelectorValue(value: string): string {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
}

function findScoreboardCard(root: Element, profileId: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    `[data-games-scoreboard-card="${escapeSelectorValue(profileId)}"]`,
  );
}

function preserveClass(live: Element | null, next: Element | null, className: string): void {
  if (!live?.classList.contains(className) || !next) return;
  next.classList.add(className);
}

function shouldPreserveScoreAnimation(live: HTMLElement, next: HTMLElement): boolean {
  return (
    live.dataset.gamesScoreAnimated === "true" &&
    live.dataset.gamesScoreFrom === next.dataset.gamesScoreFrom &&
    live.dataset.gamesScoreTo === next.dataset.gamesScoreTo &&
    live.dataset.gamesScoreStartAt === next.dataset.gamesScoreStartAt
  );
}

/**
 * Переносит runtime-состояние scoreboard-анимаций в следующий HTML-снимок.
 */
function preserveScoreboardRuntimeState(live: HTMLElement, next: HTMLElement): void {
  const liveList = live.querySelector<HTMLElement>("[data-games-scoreboard-list]");
  const nextList = next.querySelector<HTMLElement>("[data-games-scoreboard-list]");
  const sameSortSchedule =
    liveList &&
    nextList &&
    liveList.dataset.gamesScoreboardSortAt === nextList.dataset.gamesScoreboardSortAt &&
    liveList.dataset.gamesScoreboardFinalOrder === nextList.dataset.gamesScoreboardFinalOrder;

  if (sameSortSchedule && liveList.dataset.gamesScoreboardSorted === "true") {
    Array.from(liveList.querySelectorAll<HTMLElement>("[data-games-scoreboard-card]")).forEach(
      (liveCard) => {
        const profileId = liveCard.dataset.gamesScoreboardCard ?? "";
        const nextCard = profileId ? findScoreboardCard(nextList, profileId) : null;
        if (nextCard) nextList.append(nextCard);
      },
    );
    nextList.dataset.gamesScoreboardSorted = "true";
  }

  live.querySelectorAll<HTMLElement>("[data-games-scoreboard-card]").forEach((liveCard) => {
    const profileId = liveCard.dataset.gamesScoreboardCard ?? "";
    const nextCard = profileId ? findScoreboardCard(next, profileId) : null;
    if (!nextCard) return;

    preserveClass(liveCard, nextCard, "games-game-player--sorting");

    const liveScoreShell = liveCard.querySelector<HTMLElement>("[data-games-score-shell]");
    const nextScoreShell = nextCard.querySelector<HTMLElement>("[data-games-score-shell]");
    preserveClass(liveScoreShell, nextScoreShell, "games-game-player__score--showing-round-points");

    const liveScore = liveCard.querySelector<HTMLElement>("[data-games-score-animate]");
    const nextScore = nextCard.querySelector<HTMLElement>("[data-games-score-animate]");
    if (liveScore && nextScore && shouldPreserveScoreAnimation(liveScore, nextScore)) {
      nextScore.dataset.gamesScoreAnimated = "true";
      nextScore.textContent = liveScore.textContent;
      preserveClass(liveScore, nextScore, "games-game-player__score-value--bump");
    }

    const liveBadge = liveCard.querySelector<HTMLElement>("[data-games-round-points-badge]");
    const nextBadge = nextCard.querySelector<HTMLElement>("[data-games-round-points-badge]");
    preserveClass(liveBadge, nextBadge, "games-game-player__round-points--visible");
  });
}

/**
 * Обновляет содержимое смонтированного контейнера без замены живых DOM-узлов.
 */
function patchMountedHtml(container: HTMLElement, html: string): void {
  const next = container.cloneNode(false) as HTMLElement;
  next.innerHTML = html;
  preserveScoreboardRuntimeState(container, next);
  domPatch(container, next);
}

/**
 * Проверяет, нужно ли пересобрать app shell из-за смены layout комнаты.
 */
export function shouldRerenderGamesShell(
  root: GamesDomRefreshRoot,
  room: GameRoom | null,
): boolean {
  if (!root || !room) return false;
  const needsGameRoomLayout = room.status !== "waiting";
  const hasGameRoomLayout = Boolean(root.querySelector(".app-layout--game-room"));
  return needsGameRoomLayout !== hasGameRoomLayout;
}

/**
 * Обновляет content, rail и внешний чат без пересборки app shell.
 */
function refreshMountedGamesContent(options: GamesDomRefreshOptions): void {
  const { root } = options;
  if (!root) return;
  const content = root.querySelector<HTMLElement>("[data-games-content]");
  if (!content) return;

  patchMountedHtml(content, options.renderContent());
  refreshGamesOverlayDom(options);

  const playersRail = root.querySelector<HTMLElement>("[data-games-room-players-rail]");
  if (playersRail) {
    patchMountedHtml(playersRail, options.room ? options.renderPlayersRail(options.room) : "");
  }

  const externalChat = root.querySelector<HTMLElement>("[data-games-external-chat]");
  if (externalChat) {
    patchMountedHtml(externalChat, options.room ? options.renderRoomChat(options.room) : "");
  }
}

/**
 * Обновляет контент страницы игр без пересборки app shell.
 */
export function refreshGamesDom(options: GamesDomRefreshOptions): void {
  const { root } = options;
  if (!root) return;
  if (shouldRerenderGamesShell(root, options.room)) {
    refreshGamesShellDom(options);
    return;
  }

  refreshMountedGamesContent(options);
  syncGamesDomAfterRender(options);
}

/**
 * Пересобирает полный app shell страницы игр.
 */
export function refreshGamesShellDom(options: GamesDomRefreshOptions): void {
  const { root } = options;
  if (!root) return;
  const page = root.querySelector<HTMLElement>(".app-page");
  if (!page) return;

  page.outerHTML = options.renderPageShell();
  syncGamesDomAfterRender(options, { syncRoomSubscription: true });
}
