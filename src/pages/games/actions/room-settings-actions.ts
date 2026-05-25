import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { getPasswordVisibilityPatch } from "../state/action-patches";
import type { GamesPageState } from "../state/store";
import {
  removeRoomPasswordAction,
  renameRoomTitleFromFormAction,
  updateRoomPasswordFromFormAction,
} from "./room-settings-forms";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type RoomSettingsActionsOptions = {
  getRoom: () => GameRoom | null;
  getCurrentMessages: () => GameRoomMessage[];
  getPasswordVisible: () => boolean;
  getSystemMessages: (previousRoom: GameRoom, nextRoom: GameRoom) => GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  rememberRoomTitle: (roomId: string, title: string) => void;
  refreshCurrentRoom: () => Promise<void>;
  showToast: (message: string) => void;
  setGamesState: SetGamesState;
};

/**
 * Создаёт фасад действий настроек комнаты.
 */
export function createRoomSettingsActions(options: RoomSettingsActionsOptions) {
  /**
   * Переименовывает комнату из формы модального окна.
   */
  async function handleRenameRoomTitle(form: HTMLFormElement): Promise<void> {
    await renameRoomTitleFromFormAction(form, {
      room: options.getRoom(),
      currentMessages: options.getCurrentMessages(),
      getSystemMessages: options.getSystemMessages,
      mergeMessages: options.mergeMessages,
      rememberRoomTitle: options.rememberRoomTitle,
      setGamesState: options.setGamesState,
    });
  }

  /**
   * Обновляет пароль комнаты из формы.
   */
  async function handlePasswordForm(form: HTMLFormElement): Promise<void> {
    await updateRoomPasswordFromFormAction(form, {
      room: options.getRoom(),
      refreshCurrentRoom: options.refreshCurrentRoom,
      showToast: options.showToast,
      setGamesState: options.setGamesState,
    });
  }

  /**
   * Убирает пароль текущей комнаты.
   */
  async function handleRemovePassword(): Promise<void> {
    await removeRoomPasswordAction({
      room: options.getRoom(),
      refreshCurrentRoom: options.refreshCurrentRoom,
      showToast: options.showToast,
      setGamesState: options.setGamesState,
    });
  }

  /**
   * Переключает отображение пароля комнаты.
   */
  async function handleShowPassword(): Promise<void> {
    options.setGamesState(
      getPasswordVisibilityPatch(options.getRoom(), options.getPasswordVisible()),
    );
  }

  return {
    handleRenameRoomTitle,
    handlePasswordForm,
    handleRemovePassword,
    handleShowPassword,
  };
}
