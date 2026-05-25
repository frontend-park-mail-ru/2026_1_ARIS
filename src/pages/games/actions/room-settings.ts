import {
  updateGameRoomPassword,
  updateGameRoomTitle,
  type GameRoom,
  type GameRoomMessage,
} from "../../../api/games";
import { ApiError } from "../../../api/core/client";
import { getInlineRoomLoadingPatch, getPasswordActionSuccessPatch } from "../state/action-patches";
import { getRoomUpdatePatch } from "../state/room-update-patches";
import type { GamesPageState } from "../state/store";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type RenameRoomTitleOptions = {
  room: GameRoom | null;
  title: string;
  currentMessages: GameRoomMessage[];
  getSystemMessages: (previousRoom: GameRoom, nextRoom: GameRoom) => GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  rememberRoomTitle: (roomId: string, title: string) => void;
  onDuplicateTitle: (message: string) => void;
  setGamesState: SetGamesState;
};

export type UpdateRoomPasswordOptions = {
  room: GameRoom | null;
  password: string;
  successMessage: string;
  refreshCurrentRoom: () => Promise<void>;
  showToast: (message: string) => void;
  setGamesState: SetGamesState;
};

/**
 * Проверяет ошибку повторяющегося названия комнаты.
 */
function isDuplicateRoomTitleError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.message === "Комната с таким названием уже существует";
}

/**
 * Переименовывает комнату и обновляет локальное состояние без отдельного refresh.
 */
export async function renameRoomTitle(options: RenameRoomTitleOptions): Promise<void> {
  const { room, title, setGamesState } = options;
  if (!room || !title) return;

  setGamesState(getInlineRoomLoadingPatch());
  try {
    await updateGameRoomTitle(room.id, title);
  } catch (error) {
    if (isDuplicateRoomTitleError(error)) {
      setGamesState({ loading: false, message: "", error: "", errorTarget: "" });
      options.onDuplicateTitle(error.message);
      return;
    }
    throw error;
  }

  const renamedRoom = { ...room, title };
  const systemMessages = options.getSystemMessages(room, renamedRoom);
  setGamesState(
    getRoomUpdatePatch({
      room: renamedRoom,
      currentMessages: options.currentMessages,
      systemMessages,
      mergeMessages: options.mergeMessages,
      patch: {
        renameTitleModalOpen: false,
        titleMenuOpen: false,
        loading: false,
        message: "Название комнаты изменено",
        messageReturnRoomId: "",
        messageReturnInviteCode: "",
        messageReturnPassword: "",
        messageRefreshRooms: false,
        error: "",
        errorTarget: "",
      },
    }),
  );
  options.rememberRoomTitle(room.id, title);
}

/**
 * Обновляет пароль комнаты и refresh-ит комнату после успешного сохранения.
 */
export async function updateRoomPassword(options: UpdateRoomPasswordOptions): Promise<void> {
  const { room, password, setGamesState } = options;
  if (!room) return;

  setGamesState(getInlineRoomLoadingPatch());
  await updateGameRoomPassword(room.id, password);
  options.showToast(options.successMessage);
  setGamesState(getPasswordActionSuccessPatch());
  await options.refreshCurrentRoom();
}
