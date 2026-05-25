import type { GameLeaderboard, GameRoom, GameType } from "../../../api/games";
import type { GamesPageState } from "../state/store";

export type LoadWaitingRoomsActionOptions = {
  preserveMessage?: boolean;
  silent?: boolean;
};

export type LoadWaitingRoomsActionDeps = {
  fetchRooms: () => Promise<GameRoom[]>;
  hydrateRooms: (rooms: GameRoom[]) => Promise<GameRoom[]>;
  getRoomsErrorMessage: (error: unknown) => string;
  setGamesState: (patch: Partial<GamesPageState>) => void;
};

export type LoadLeaderboardActionOptions = {
  silent?: boolean;
};

export type LoadLeaderboardActionDeps = {
  gameType: GameType;
  fetchLeaderboard: (gameType: GameType) => Promise<GameLeaderboard>;
  hydratePlayers: (players: GameRoom["players"]) => Promise<GameRoom["players"]>;
  prepareAvatarLinks: (links: string[]) => Promise<unknown>;
  getPlayerAvatarUrl: (player: GameRoom["players"][number]) => string;
  getErrorMessage: (error: unknown, fallback: string) => string;
  setGamesState: (patch: Partial<GamesPageState>) => void;
};

/**
 * Загружает список комнат лобби и синхронизирует состояние загрузки.
 */
export async function loadWaitingRoomsAction(
  options: LoadWaitingRoomsActionOptions | undefined,
  deps: LoadWaitingRoomsActionDeps,
): Promise<void> {
  if (!options?.silent) {
    deps.setGamesState({
      roomsLoading: true,
      roomsError: "",
      ...(options?.preserveMessage
        ? {}
        : {
            message: "",
            messageReturnRoomId: "",
            messageReturnInviteCode: "",
            messageReturnPassword: "",
            messageRefreshRooms: false,
          }),
      error: "",
    });
  }

  try {
    const rooms = await deps.hydrateRooms(await deps.fetchRooms());
    deps.setGamesState({
      rooms,
      roomsError: "",
      roomsLoading: false,
      ...(options?.preserveMessage ? {} : { messageRefreshRooms: false }),
    });
  } catch (error) {
    if (options?.silent) {
      return;
    }
    deps.setGamesState({
      rooms: [],
      roomsLoading: false,
      roomsError: deps.getRoomsErrorMessage(error),
      error: "",
    });
  }
}

/**
 * Загружает leaderboard выбранной игры и подготавливает аватары игроков.
 */
export async function loadLeaderboardAction(
  options: LoadLeaderboardActionOptions | undefined,
  deps: LoadLeaderboardActionDeps,
): Promise<void> {
  if (!options?.silent) {
    deps.setGamesState({
      leaderboardLoading: true,
      leaderboardError: "",
      message: "",
      error: "",
    });
  }

  try {
    const rawLeaderboard = await deps.fetchLeaderboard(deps.gameType);
    const players = await deps.hydratePlayers(rawLeaderboard.entries.map((entry) => entry.player));
    const leaderboard = {
      ...rawLeaderboard,
      entries: rawLeaderboard.entries.map((entry, index) => ({
        ...entry,
        player: players[index] ?? entry.player,
      })),
    };
    await deps.prepareAvatarLinks(
      leaderboard.entries.map((entry) => deps.getPlayerAvatarUrl(entry.player)),
    );
    deps.setGamesState({
      leaderboard,
      leaderboardLoading: false,
      leaderboardError: "",
      error: "",
    });
  } catch (error) {
    if (options?.silent) return;
    deps.setGamesState({
      leaderboardLoading: false,
      leaderboardError: deps.getErrorMessage(error, "Не удалось загрузить рейтинг."),
    });
  }
}
