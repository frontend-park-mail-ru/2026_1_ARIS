/**
 * Actions переключения режима лобби игр.
 *
 * Сбрасывают временное UI-состояние лобби и запускают загрузку данных для
 * выбранного раздела.
 */
import type { GamesLobbyMode, GamesPageState } from "../state/store";

export type SelectLobbyModeActionOptions = {
  setGamesState: (patch: Partial<GamesPageState>) => void;
  loadWaitingRooms: () => Promise<void>;
  loadLeaderboard: () => Promise<void>;
};

/**
 * Переключает режим лобби и загружает данные выбранного раздела.
 */
export async function selectLobbyModeAction(
  mode: GamesLobbyMode,
  options: SelectLobbyModeActionOptions,
): Promise<void> {
  options.setGamesState({
    lobbyMode: mode,
    message: "",
    messageReturnRoomId: "",
    messageRefreshRooms: false,
    participantsStatusHintOpen: false,
    readyStatusHintOpen: false,
    error: "",
    loading: false,
    joinInviteCodeValue: "",
    joinPasswordValue: "",
    joinInviteCodeError: "",
    joinPasswordError: "",
    ...(mode === "rooms" ? {} : { roomsError: "", roomsLoading: false }),
    ...(mode === "leaderboard" ? {} : { leaderboardError: "", leaderboardLoading: false }),
  });

  if (mode === "rooms") {
    await options.loadWaitingRooms();
  }
  if (mode === "leaderboard") {
    await options.loadLeaderboard();
  }
}
