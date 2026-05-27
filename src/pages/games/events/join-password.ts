import type { GameRoom } from "../../../api/games";
import type { GamesPageState } from "../state/store";
import { gameT } from "../shared/i18n";

export type HandleGamesJoinPasswordClickOptions = {
  rooms: GameRoom[];
  isRoomCreatedByCurrentUser: (room: GameRoom) => boolean;
  shouldBlockFullRoomJoin: (room: GameRoom) => boolean;
  handleJoinOwnListedRoom: (room: GameRoom) => Promise<void>;
  showRoomFullMessage: () => void;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  getErrorMessage: (error: unknown, fallback: string) => string;
};

/**
 * Возвращает patch для открытия password-модалки выбранной комнаты.
 */
function getOpenJoinPasswordPatch(roomId: string): Partial<GamesPageState> {
  return {
    joinPasswordRoomId: roomId,
    joinPasswordValue: "",
    joinPasswordVisible: false,
    joinPasswordError: "",
    message: "",
    error: "",
    errorTarget: "",
  };
}

/**
 * Возвращает patch для закрытия password-модалки присоединения.
 */
function getCloseJoinPasswordPatch(): Partial<GamesPageState> {
  return {
    joinPasswordRoomId: "",
    joinPasswordValue: "",
    joinPasswordVisible: false,
    joinPasswordError: "",
    message: "",
    error: "",
    errorTarget: "",
  };
}

/**
 * Сохраняет ошибку возврата в собственную комнату из списка.
 */
function setJoinOwnRoomError(options: HandleGamesJoinPasswordClickOptions, error: unknown): void {
  options.setGamesState({
    loading: false,
    message: "",
    error: options.getErrorMessage(error, gameT("room.recoverOwnError")),
    errorTarget: "form",
  });
}

/**
 * Обрабатывает click по кнопке входа в комнату с паролем.
 */
function handleJoinPasswordRoomClick(
  event: Event,
  joinPasswordButton: HTMLElement,
  options: HandleGamesJoinPasswordClickOptions,
): boolean {
  event.preventDefault();
  const roomId = joinPasswordButton.getAttribute("data-games-join-password-room") ?? "";
  const room = options.rooms.find((item) => item.id === roomId);

  if (room && options.isRoomCreatedByCurrentUser(room)) {
    void options.handleJoinOwnListedRoom(room).catch((error: unknown) => {
      setJoinOwnRoomError(options, error);
    });
    return true;
  }

  if (room && options.shouldBlockFullRoomJoin(room)) {
    options.showRoomFullMessage();
    return true;
  }

  options.setGamesState(getOpenJoinPasswordPatch(roomId));
  return true;
}

/**
 * Обрабатывает закрытие password-модалки присоединения.
 */
function handleJoinPasswordCloseClick(
  event: Event,
  target: Element,
  options: HandleGamesJoinPasswordClickOptions,
): boolean {
  const joinPasswordModal = target.closest("[data-games-join-password-modal]");
  const shouldClose =
    target.closest("[data-games-join-password-close]") ||
    (joinPasswordModal instanceof HTMLElement && joinPasswordModal === target);

  if (!shouldClose) return false;

  event.preventDefault();
  options.setGamesState(getCloseJoinPasswordPatch());
  return true;
}

/**
 * Сохраняет состояние видимости пароля после клика по eye-toggle.
 */
function handleJoinPasswordVisibilityClick(
  target: Element,
  options: HandleGamesJoinPasswordClickOptions,
): boolean {
  const joinPasswordToggle = target.closest(".games-join-password-modal__input .eye-toggle");
  if (!joinPasswordToggle) return false;

  const input = joinPasswordToggle
    .closest(".games-join-password-modal__input")
    ?.querySelector<HTMLInputElement>(".input__field");
  if (input) {
    options.patchGamesState({ joinPasswordVisible: input.type !== "text" });
  }
  return true;
}

/**
 * Обрабатывает click-события открытия и закрытия password-модалки входа.
 */
export function handleGamesJoinPasswordClick(
  event: Event,
  target: Element,
  options: HandleGamesJoinPasswordClickOptions,
): boolean {
  const joinPasswordButton = target.closest("[data-games-join-password-room]");
  if (joinPasswordButton instanceof HTMLElement) {
    return handleJoinPasswordRoomClick(event, joinPasswordButton, options);
  }

  if (handleJoinPasswordVisibilityClick(target, options)) {
    return true;
  }

  return handleJoinPasswordCloseClick(event, target, options);
}
