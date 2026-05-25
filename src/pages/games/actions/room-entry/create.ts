import { ApiError } from "../../../../api/core/client";
import { createGameRoom } from "../../../../api/games";
import { getCreateRoomLoadingPatch, getExistingCreatedRoomPatch } from "../../state/action-patches";
import { getExistingCreatedRoomFromError } from "../../shared/errors";
import type { CreateRoomActionOptions } from "./types";

/**
 * Проверяет ошибку повторяющегося названия комнаты.
 */
function isDuplicateRoomTitleError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.message === "Комната с таким названием уже существует";
}

/**
 * Создаёт комнату и открывает её маршрут.
 */
export async function createRoomAction(options: CreateRoomActionOptions): Promise<void> {
  options.setGamesState(getCreateRoomLoadingPatch());

  try {
    const room = await createGameRoom(options.payload);
    options.rememberRoomTitle(room.id, options.title);
    options.rememberRoomAccess(room, { password: options.password });
    options.navigateToRoom(room.id);
  } catch (error) {
    const existingRoom = getExistingCreatedRoomFromError(error);
    if (existingRoom) {
      const roomWithAvatars = await options.hydrateRoom(existingRoom);
      options.rememberRoomTitle(roomWithAvatars.id, roomWithAvatars.title);
      options.setGamesState(getExistingCreatedRoomPatch(roomWithAvatars));
      return;
    }
    if (isDuplicateRoomTitleError(error)) {
      options.setGamesState({ loading: false, message: "", error: "", errorTarget: "" });
      options.onDuplicateTitle(error.message);
      return;
    }
    throw error;
  }
}
