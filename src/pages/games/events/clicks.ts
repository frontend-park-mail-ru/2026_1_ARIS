import {
  handleGamesConfirmModalsClick,
  type HandleGamesConfirmModalsClickOptions,
} from "./confirm-modals";
import { handleGamesCopyClick, type HandleGamesCopyClickOptions } from "./copy-clicks";
import { handleGamesHintsClick, type HandleGamesHintsClickOptions } from "./hints";
import {
  handleGamesJoinPasswordClick,
  type HandleGamesJoinPasswordClickOptions,
} from "./join-password";
import { handleGamesLobbyClick, type HandleGamesLobbyClickOptions } from "./lobby-clicks";
import {
  handleGamesProfileNavigationClick,
  type HandleGamesProfileNavigationClickOptions,
} from "./profile-navigation";
import {
  handleGamesQuestionReportClick,
  type HandleGamesQuestionReportClickOptions,
} from "./question-report";
import {
  handleGamesRoomActionsClick,
  type HandleGamesRoomActionsClickOptions,
} from "./room-actions";
import { handleGamesRoomMenusClick, type HandleGamesRoomMenusClickOptions } from "./room-menus";

export type BindGamesClickEventsOptions = {
  profileNavigation: HandleGamesProfileNavigationClickOptions;
  hints: HandleGamesHintsClickOptions;
  lobby: HandleGamesLobbyClickOptions;
  copy: HandleGamesCopyClickOptions;
  joinPassword: HandleGamesJoinPasswordClickOptions;
  confirmModals: HandleGamesConfirmModalsClickOptions;
  questionReport: HandleGamesQuestionReportClickOptions;
  roomActions: HandleGamesRoomActionsClickOptions;
  roomMenus: HandleGamesRoomMenusClickOptions;
};

export type BindGamesClickEventsOptionsSource =
  | BindGamesClickEventsOptions
  | (() => BindGamesClickEventsOptions);

/**
 * Возвращает актуальные options для click-dispatcher.
 */
function getGamesClickOptions(
  source: BindGamesClickEventsOptionsSource,
): BindGamesClickEventsOptions {
  return typeof source === "function" ? source() : source;
}

/**
 * Обрабатывает click через цепочку специализированных handlers.
 */
export function handleGamesClick(
  event: Event,
  target: Element,
  options: BindGamesClickEventsOptions,
): boolean {
  if (handleGamesProfileNavigationClick(event, target, options.profileNavigation)) return true;
  if (handleGamesHintsClick(event, target, options.hints)) return true;
  if (handleGamesLobbyClick(event, target, options.lobby)) return true;
  if (handleGamesCopyClick(event, target, options.copy)) return true;
  if (handleGamesJoinPasswordClick(event, target, options.joinPassword)) return true;
  if (handleGamesConfirmModalsClick(event, target, options.confirmModals)) return true;
  if (handleGamesQuestionReportClick(event, target, options.questionReport)) return true;
  if (handleGamesRoomActionsClick(event, target, options.roomActions)) return true;
  return handleGamesRoomMenusClick(event, target, options.roomMenus);
}

/**
 * Подключает click-dispatcher страницы игр.
 */
export function bindGamesClickEvents(
  root: Document | HTMLElement,
  options: BindGamesClickEventsOptionsSource,
): void {
  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    handleGamesClick(event, target, getGamesClickOptions(options));
  });
}
