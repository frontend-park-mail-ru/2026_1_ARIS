/**
 * Form-actions настроек игровой комнаты.
 *
 * Валидируют DOM-формы названия и пароля комнаты, а затем делегируют
 * сохранение доменным actions настроек.
 */
import { getInputValue, setTitleFieldError, validateTitleField } from "../shared/forms";
import {
  renameRoomTitle,
  updateRoomPassword,
  type RenameRoomTitleOptions,
  type UpdateRoomPasswordOptions,
} from "./room-settings";

export type RenameRoomTitleFormOptions = Omit<RenameRoomTitleOptions, "title" | "onDuplicateTitle">;

export type UpdateRoomPasswordFormOptions = Omit<
  UpdateRoomPasswordOptions,
  "password" | "successMessage"
>;

/**
 * Валидирует форму названия комнаты и запускает rename action.
 */
export async function renameRoomTitleFromFormAction(
  form: HTMLFormElement,
  options: RenameRoomTitleFormOptions,
): Promise<void> {
  const titleInput = form.elements.namedItem("title");
  if (!(titleInput instanceof HTMLInputElement)) return;
  if (!validateTitleField(titleInput, true)) return;

  const title = titleInput.value.trim();
  if (!title) return;

  await renameRoomTitle({
    ...options,
    title,
    onDuplicateTitle: (message) => {
      setTitleFieldError(titleInput, message);
      titleInput.focus();
    },
  });
}

/**
 * Валидирует форму пароля комнаты и запускает password action.
 */
export async function updateRoomPasswordFromFormAction(
  form: HTMLFormElement,
  options: UpdateRoomPasswordFormOptions,
): Promise<void> {
  const password = getInputValue(form, "password");
  if (!password) {
    options.setGamesState({ message: "", error: "Введите пароль.", errorTarget: "password" });
    return;
  }

  await updateRoomPassword({
    ...options,
    password,
    successMessage: "Пароль комнаты обновлен",
  });
}

/**
 * Убирает пароль комнаты через общий password action.
 */
export async function removeRoomPasswordAction(
  options: UpdateRoomPasswordFormOptions,
): Promise<void> {
  await updateRoomPassword({
    ...options,
    password: "",
    successMessage: "Пароль комнаты убран",
  });
}
