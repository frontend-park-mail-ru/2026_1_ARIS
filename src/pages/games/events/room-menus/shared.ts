import type { GamesPageState, GamesPasswordModalMode } from "../../state/store";

/**
 * Проверяет click по кнопке закрытия модалки или по её overlay.
 */
export function isModalCloseClick(
  target: Element,
  closeSelector: string,
  modalSelector: string,
): boolean {
  const modal = target.closest(modalSelector);
  return Boolean(
    target.closest(closeSelector) || (modal instanceof HTMLElement && modal === target),
  );
}

/**
 * Возвращает mode password-модалки по action floating menu.
 */
export function getPasswordModeFromAction(action: string): GamesPasswordModalMode {
  if (action === "password-change") return "change";
  if (action === "password-set") return "set";
  if (action === "password-remove") return "remove";
  return "";
}

/**
 * Возвращает mode password-модалки из data-атрибута кнопки.
 */
export function getPasswordModeFromAttribute(value: string | null): GamesPasswordModalMode {
  if (value === "set" || value === "change" || value === "remove") return value;
  return "";
}

/**
 * Возвращает patch открытия confirm-модалки жалобы из floating menu.
 */
export function getQuestionReportConfirmPatch(
  questionKey: string,
  closeGamesMenus: () => Partial<GamesPageState>,
): Partial<GamesPageState> {
  return {
    ...closeGamesMenus(),
    reportConfirmQuestionKey: questionKey,
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    kickConfirmProfileId: "",
    adminConfirmProfileId: "",
    message: "",
    error: "",
  };
}

/**
 * Возвращает patch открытия confirm-модалки назначения администратора.
 */
export function getAdminConfirmPatch(
  profileId: string,
  closeGamesMenus: () => Partial<GamesPageState>,
): Partial<GamesPageState> {
  return {
    ...closeGamesMenus(),
    adminConfirmProfileId: profileId,
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    kickConfirmProfileId: "",
    message: "",
    error: "",
  };
}

/**
 * Возвращает patch открытия confirm-модалки удаления игрока.
 */
export function getKickConfirmPatch(
  profileId: string,
  closeGamesMenus: () => Partial<GamesPageState>,
): Partial<GamesPageState> {
  return {
    ...closeGamesMenus(),
    kickConfirmProfileId: profileId,
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    adminConfirmProfileId: "",
    message: "",
    error: "",
  };
}
