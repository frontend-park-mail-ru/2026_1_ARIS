import type { GamesPageState } from "../../state/store";
import { gameT } from "../../shared/i18n";
import type { HandleGamesConfirmModalsClickOptions } from "./types";

/**
 * Сохраняет ошибку confirm-action в footer.
 */
function setConfirmActionError(
  options: HandleGamesConfirmModalsClickOptions,
  patch: Partial<GamesPageState>,
  error: unknown,
  fallback: string,
): void {
  options.setGamesState({
    loading: false,
    ...patch,
    message: "",
    error: options.getErrorMessage(error, fallback),
    errorTarget: "footer",
  });
}

/**
 * Обрабатывает подтверждение confirm-действий комнаты.
 */
export function handleConfirmActionClick(
  event: Event,
  target: Element,
  options: HandleGamesConfirmModalsClickOptions,
): boolean {
  if (target.closest("[data-games-disband-confirm]")) {
    event.preventDefault();
    void options.handleDisbandRoom().catch((error: unknown) => {
      setConfirmActionError(
        options,
        { disbandConfirmOpen: false },
        error,
        gameT("room.disbandError"),
      );
    });
    return true;
  }

  if (target.closest("[data-games-kick-confirm]")) {
    event.preventDefault();
    void options.handleKickPlayer(options.state.kickConfirmProfileId).catch((error: unknown) => {
      setConfirmActionError(
        options,
        { kickConfirmProfileId: "", playerMenuProfileId: "" },
        error,
        gameT("room.kickError"),
      );
    });
    return true;
  }

  if (target.closest("[data-games-admin-confirm]")) {
    event.preventDefault();
    void options.handleAssignAdmin(options.state.adminConfirmProfileId).catch((error: unknown) => {
      setConfirmActionError(
        options,
        { adminConfirmProfileId: "", playerMenuProfileId: "" },
        error,
        gameT("room.assignAdminError"),
      );
    });
    return true;
  }

  if (target.closest("[data-games-start-confirm]")) {
    event.preventDefault();
    void options.handleStartRoom().catch((error: unknown) => {
      setConfirmActionError(options, { startConfirmOpen: false }, error, gameT("room.startError"));
    });
    return true;
  }

  if (target.closest("[data-games-leave-confirm]")) {
    event.preventDefault();
    void options.handleExitGameToMenu().catch((error: unknown) => {
      setConfirmActionError(options, { leaveConfirmOpen: false }, error, gameT("room.leaveError"));
    });
    return true;
  }

  return false;
}
