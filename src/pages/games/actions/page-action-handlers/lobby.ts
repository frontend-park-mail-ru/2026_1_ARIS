import { getGameLeaderboard, getGameRooms } from "../../../../api/games";
import { prepareAvatarLinks } from "../../../../utils/avatar";
import { getErrorMessage, getRoomsErrorMessage } from "../../shared/errors";
import { createGamesLobbyActions } from "../lobby-actions";
import type { GamesPageActionHandlersOptions } from "./types";

/**
 * Создаёт handlers каталога комнат и таблицы лидеров для страницы игр.
 */
export function createPageLobbyActions(options: GamesPageActionHandlersOptions) {
  return createGamesLobbyActions({
    gameType: "number_duel",
    fetchRooms: getGameRooms,
    fetchLeaderboard: getGameLeaderboard,
    hydrateRooms: options.hydrateGameRoomsAvatars,
    hydratePlayers: options.hydrateGamePlayersAvatars,
    prepareAvatarLinks,
    getPlayerAvatarUrl: options.getPlayerAvatarUrl,
    getRoomsErrorMessage,
    getErrorMessage,
    setGamesState: options.setGamesState,
  });
}
