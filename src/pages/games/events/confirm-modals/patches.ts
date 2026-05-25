import type { GamesPageState } from "../../state/store";

/**
 * Возвращает patch открытия confirm-модалки роспуска комнаты.
 */
export function getOpenDisbandConfirmPatch(): Partial<GamesPageState> {
  return {
    disbandConfirmOpen: true,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    reportConfirmQuestionKey: "",
    kickConfirmProfileId: "",
    adminConfirmProfileId: "",
    playerMenuProfileId: "",
    message: "",
    error: "",
  };
}

/**
 * Возвращает patch открытия confirm-модалки старта игры.
 */
export function getOpenStartConfirmPatch(): Partial<GamesPageState> {
  return {
    startConfirmOpen: true,
    disbandConfirmOpen: false,
    leaveConfirmOpen: false,
    kickConfirmProfileId: "",
    adminConfirmProfileId: "",
    playerMenuProfileId: "",
    message: "",
    error: "",
  };
}

/**
 * Возвращает patch открытия confirm-модалки выхода из комнаты.
 */
export function getOpenLeaveConfirmPatch(): Partial<GamesPageState> {
  return {
    leaveConfirmOpen: true,
    startConfirmOpen: false,
    disbandConfirmOpen: false,
    kickConfirmProfileId: "",
    message: "",
    error: "",
  };
}

/**
 * Возвращает patch открытия confirm-модалки удаления игрока.
 */
export function getOpenKickConfirmPatch(profileId: string): Partial<GamesPageState> {
  return {
    kickConfirmProfileId: profileId,
    playerMenuProfileId: "",
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    adminConfirmProfileId: "",
    message: "",
    error: "",
  };
}

/**
 * Возвращает patch открытия confirm-модалки назначения администратора.
 */
export function getOpenAdminConfirmPatch(profileId: string): Partial<GamesPageState> {
  return {
    adminConfirmProfileId: profileId,
    playerMenuProfileId: "",
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    kickConfirmProfileId: "",
    message: "",
    error: "",
  };
}
