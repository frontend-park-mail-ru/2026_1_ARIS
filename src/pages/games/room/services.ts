/**
 * Композиция сервисов комнаты игры.
 *
 * Собирает display/current-user/avatar/messages helpers в один слой, чтобы
 * page-слой работал с готовым набором room-зависимостей.
 */
import type { GameRoomAvatarServiceOptions } from "./profile/avatars";
import { createGameCurrentUserService } from "./current-user";
import { createRoomDisconnectRemovalTracker } from "./disconnect-removal";
import { createGameRoomDisplayService } from "./display";
import { createRoomMessagesService } from "./messages";
import { createGameRoomAvatarService } from "./profile/avatars";

export type GamesRoomServicesOptions = {
  getSessionUser: GameRoomAvatarServiceOptions["getSessionUser"];
  loadAvatarUrlById?: GameRoomAvatarServiceOptions["loadAvatarUrlById"];
  loadProfile: GameRoomAvatarServiceOptions["loadProfile"];
};

/**
 * Создаёт набор сервисов комнаты для страницы игр.
 */
export function createGamesRoomServices(options: GamesRoomServicesOptions) {
  const display = createGameRoomDisplayService();
  const disconnectRemoval = createRoomDisconnectRemovalTracker();
  const messages = createRoomMessagesService({
    consumeDisconnectRemoval: disconnectRemoval.consumeRoomDisconnectRemoval,
  });
  const currentUser = createGameCurrentUserService({
    getSessionUser: options.getSessionUser,
  });
  const avatars = createGameRoomAvatarService({
    getCurrentProfileId: currentUser.getCurrentProfileId,
    getCurrentPlayer: currentUser.getCurrentPlayer,
    getSessionUser: options.getSessionUser,
    loadProfile: options.loadProfile,
    rememberRoomTitle: display.rememberRoomTitle,
    ...(options.loadAvatarUrlById ? { loadAvatarUrlById: options.loadAvatarUrlById } : {}),
  });

  return {
    ...display,
    ...disconnectRemoval,
    ...messages,
    ...currentUser,
    ...avatars,
  };
}
