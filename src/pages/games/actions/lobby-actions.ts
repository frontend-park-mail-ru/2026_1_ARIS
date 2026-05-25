import type { GameLeaderboard, GameRoom, GameType } from "../../../api/games";
import type { GamesLobbyMode, GamesPageState } from "../state/store";
import {
  loadLeaderboardAction,
  loadWaitingRoomsAction,
  type LoadLeaderboardActionOptions,
  type LoadWaitingRoomsActionOptions,
} from "./lobby-data";
import { selectLobbyModeAction } from "./lobby-mode";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type GamesLobbyActionsOptions = {
  gameType: GameType;
  fetchRooms: () => Promise<GameRoom[]>;
  fetchLeaderboard: (gameType: GameType) => Promise<GameLeaderboard>;
  hydrateRooms: (rooms: GameRoom[]) => Promise<GameRoom[]>;
  hydratePlayers: (players: GameRoom["players"]) => Promise<GameRoom["players"]>;
  prepareAvatarLinks: (links: string[]) => Promise<unknown>;
  getPlayerAvatarUrl: (player: GameRoom["players"][number]) => string;
  getRoomsErrorMessage: (error: unknown) => string;
  getErrorMessage: (error: unknown, fallback: string) => string;
  setGamesState: SetGamesState;
};

/**
 * Создаёт фасад загрузки данных лобби выбранной игры.
 */
export function createGamesLobbyActions(options: GamesLobbyActionsOptions) {
  /**
   * Загружает список комнат ожидания.
   */
  async function loadWaitingRooms(loadOptions?: LoadWaitingRoomsActionOptions): Promise<void> {
    await loadWaitingRoomsAction(loadOptions, {
      fetchRooms: options.fetchRooms,
      hydrateRooms: options.hydrateRooms,
      getRoomsErrorMessage: options.getRoomsErrorMessage,
      setGamesState: options.setGamesState,
    });
  }

  /**
   * Загружает leaderboard текущей игры.
   */
  async function loadLeaderboard(loadOptions?: LoadLeaderboardActionOptions): Promise<void> {
    await loadLeaderboardAction(loadOptions, {
      gameType: options.gameType,
      fetchLeaderboard: options.fetchLeaderboard,
      hydratePlayers: options.hydratePlayers,
      prepareAvatarLinks: options.prepareAvatarLinks,
      getPlayerAvatarUrl: options.getPlayerAvatarUrl,
      getErrorMessage: options.getErrorMessage,
      setGamesState: options.setGamesState,
    });
  }

  /**
   * Переключает режим лобби и подгружает нужные данные.
   */
  async function selectLobbyMode(mode: GamesLobbyMode): Promise<void> {
    await selectLobbyModeAction(mode, {
      setGamesState: options.setGamesState,
      loadWaitingRooms: () => loadWaitingRooms(),
      loadLeaderboard: () => loadLeaderboard(),
    });
  }

  return {
    loadWaitingRooms,
    loadLeaderboard,
    selectLobbyMode,
  };
}
