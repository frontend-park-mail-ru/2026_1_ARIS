import type { GamesLobbyMode } from "../../state/store";
import type { HandleGamesLobbyClickOptions } from "./types";
import { gameT } from "../../shared/i18n";

/**
 * Проверяет, что строка является режимом лобби игр.
 */
function isGamesLobbyMode(value: string | null): value is GamesLobbyMode {
  return (
    value === "menu" ||
    value === "create" ||
    value === "rooms" ||
    value === "join" ||
    value === "leaderboard"
  );
}

/**
 * Обрабатывает выбор режима лобби.
 */
export function handleLobbyModeClick(
  event: Event,
  button: HTMLElement,
  options: HandleGamesLobbyClickOptions,
): boolean {
  event.preventDefault();
  const mode = button.getAttribute("data-games-lobby-mode");
  if (!isGamesLobbyMode(mode)) return true;

  void options.selectLobbyMode(mode).catch((error: unknown) => {
    options.setGamesState({
      roomsLoading: false,
      loading: false,
      message: "",
      error: options.getErrorMessage(error, gameT("rooms.openSectionError")),
    });
  });
  return true;
}
