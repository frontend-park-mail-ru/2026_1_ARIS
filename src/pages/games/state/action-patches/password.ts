import type { GameRoom } from "../../../../api/games";
import { gameT } from "../../shared/i18n";
import type { GamesStatePatch } from "./types";

/**
 * Возвращает state-patch закрытия password-модалки после успешного действия.
 */
export function getPasswordActionSuccessPatch(): GamesStatePatch {
  return {
    passwordModalMode: "",
    passwordMenuOpen: false,
    passwordVisible: false,
    errorTarget: "",
  };
}

/**
 * Возвращает state-patch переключения видимости пароля комнаты.
 */
export function getPasswordVisibilityPatch(
  room: GameRoom | null,
  passwordVisible: boolean,
): GamesStatePatch {
  if (!room?.hasPassword) {
    return {
      passwordMenuOpen: false,
      passwordVisible: false,
      message: "",
      error: "",
      errorTarget: "",
    };
  }

  const password = room.password.trim();
  if (!password && !passwordVisible) {
    return {
      passwordMenuOpen: false,
      message: "",
      error: gameT("room.passwordMissing"),
      errorTarget: "password",
    };
  }

  return {
    passwordMenuOpen: false,
    passwordVisible: !passwordVisible,
    message: "",
    error: "",
    errorTarget: "",
  };
}
