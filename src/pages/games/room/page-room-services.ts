/**
 * Composition сервисов комнаты для страницы игр.
 *
 * Собирает room services, восстановление доступа и feedback actions в один
 * доменный фасад, чтобы entrypoint не держал детали профиля, session и access.
 */
import { joinGameRoom } from "../../../api/games";
import { getMediaUrlById } from "../../../api/media";
import { getProfileById } from "../../../api/profile";
import { getSessionUser } from "../../../state/session";
import { createRoomAccessRecoveryActions } from "../actions/room-access-recovery-actions";
import { createRoomFeedbackActions } from "../actions/room-feedback-actions";
import type { PendingVoluntaryLeave } from "./lifecycle";
import type { GamesPageState } from "../state/store";
import {
  canRecoverRoomAccess,
  clearRoomAccessRecovery,
  forgetRoomAccess,
  getStoredRoomAccess,
  rememberRoomAccess,
} from "./access";
import { createGamesRoomServices } from "./services";

export type GamesPageRoomServicesOptions = {
  getPasswordVisible: () => boolean;
  getPendingVoluntaryLeave: () => PendingVoluntaryLeave | null;
  setPendingVoluntaryLeave: (pending: PendingVoluntaryLeave | null) => void;
  setGamesState: (patch: Partial<GamesPageState>) => void;
};

export type GamesPageRoomServices = ReturnType<typeof createGamesPageRoomServices>;

/**
 * Создаёт доменный фасад комнаты для страницы игр.
 */
export function createGamesPageRoomServices(options: GamesPageRoomServicesOptions) {
  const roomServices = createGamesRoomServices({
    getSessionUser,
    loadAvatarUrlById: getMediaUrlById,
    loadProfile: getProfileById,
  });
  const { recoverRoomAccess } = createRoomAccessRecoveryActions({
    getStoredRoomAccess,
    joinRoom: joinGameRoom,
    canRecoverRoomAccess,
    hydrateRoomAvatars: roomServices.hydrateGameRoomAvatars,
    rememberRoomAccess,
  });
  const feedbackActions = createRoomFeedbackActions({
    getPasswordVisible: options.getPasswordVisible,
    getRoomPasswordDisplayValue: roomServices.getRoomPasswordDisplayValue,
    getPendingVoluntaryLeave: options.getPendingVoluntaryLeave,
    setPendingVoluntaryLeave: options.setPendingVoluntaryLeave,
    setGamesState: options.setGamesState,
  });

  return {
    ...roomServices,
    ...feedbackActions,
    canRecoverRoomAccess,
    clearRoomAccessRecovery,
    forgetRoomAccess,
    rememberRoomAccess,
    recoverRoomAccess,
  };
}
