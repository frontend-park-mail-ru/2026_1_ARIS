import {
  forceResumeGameRoom,
  pauseGameRoom,
  startGameRoom,
  type GameRoom,
  type GameRoomMessage,
} from "../../../api/games";
import { getInlineRoomLoadingPatch } from "../state/action-patches";
import { getRoomUpdatePatch } from "../state/room-update-patches";
import type { GamesPageState } from "../state/store";
import { canCurrentPlayerForceResume, canCurrentPlayerPause } from "../room/selectors";
import { playPublicLobbyStartSound, primePublicLobbyStartSound } from "../room/public-lobby-sound";
import { gameT } from "../shared/i18n";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type PauseCurrentRoomOptions = {
  room: GameRoom | null;
  setGamesState: SetGamesState;
};

export type ForceResumeCurrentRoomOptions = {
  room: GameRoom | null;
  setGamesState: SetGamesState;
};

export type StartCurrentRoomOptions = {
  room: GameRoom | null;
  currentProfileId: string;
  currentMessages: GameRoomMessage[];
  getSystemMessages: (previousRoom: GameRoom, nextRoom: GameRoom) => GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  setGamesState: SetGamesState;
};

/**
 * Ставит текущую активную комнату на паузу.
 */
export async function pauseCurrentRoom(options: PauseCurrentRoomOptions): Promise<void> {
  const { room, setGamesState } = options;
  if (!room || !canCurrentPlayerPause(room)) return;

  setGamesState(getInlineRoomLoadingPatch());
  const nextRoom = await pauseGameRoom(room.id);
  setGamesState({
    room: nextRoom,
    loading: false,
    message: gameT("room.paused"),
    error: "",
    errorTarget: "",
  });
}

/**
 * Отправляет голос текущего игрока за досрочное продолжение комнаты.
 */
export async function forceResumeCurrentRoom(
  options: ForceResumeCurrentRoomOptions,
): Promise<void> {
  const { room, setGamesState } = options;
  if (!room || !canCurrentPlayerForceResume(room)) return;

  setGamesState(getInlineRoomLoadingPatch());
  const nextRoom = await forceResumeGameRoom(room.id);
  setGamesState({
    room: nextRoom,
    loading: false,
    message: gameT("room.resumeVoteAccepted"),
    error: "",
    errorTarget: "",
  });
}

/**
 * Запускает игру в текущей комнате и добавляет системные сообщения перехода.
 */
export async function startCurrentRoom(options: StartCurrentRoomOptions): Promise<void> {
  const { room, setGamesState } = options;
  if (!room) return;

  primePublicLobbyStartSound(room, options.currentProfileId);

  setGamesState({
    loading: true,
    message: gameT("room.starting"),
    messageReturnRoomId: "",
    messageReturnInviteCode: "",
    messageReturnPassword: "",
    messageRefreshRooms: false,
    error: "",
    errorTarget: "",
  });

  const nextRoom = await startGameRoom(room.id);
  playPublicLobbyStartSound(room, nextRoom, options.currentProfileId);
  const systemMessages = options.getSystemMessages(room, nextRoom);
  setGamesState(
    getRoomUpdatePatch({
      room: nextRoom,
      currentMessages: options.currentMessages,
      systemMessages,
      mergeMessages: options.mergeMessages,
      patch: {
        loading: false,
        startConfirmOpen: false,
        kickConfirmProfileId: "",
        error: "",
        errorTarget: "",
        message: "",
      },
    }),
  );
}
