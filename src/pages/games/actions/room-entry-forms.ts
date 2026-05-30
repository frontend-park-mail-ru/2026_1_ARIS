/**
 * Form-actions входа и создания игровых комнат.
 *
 * Соединяют DOM-валидацию формы, сбор payload и доменные actions подключения
 * к комнате, чтобы page-слой не знал деталей полей формы.
 */
import type { GameRoom } from "../../../api/games";
import {
  getInputValue,
  isCreateRoomRanked,
  setTitleFieldError,
  validateCreateRoomForm,
  validateJoinRoomForm,
} from "../shared/forms";
import {
  buildCreateRoomCommand,
  buildJoinByCodePayload,
  buildJoinListedRoomPayload,
} from "../room/state/action-model";
import {
  createRoomAction,
  joinListedRoomAction,
  joinRoomByCodeAction,
  type CreateRoomActionOptions,
  type JoinListedRoomActionOptions,
  type JoinRoomByCodeActionOptions,
} from "./room-entry";

export type CreateRoomFormActionOptions = Omit<
  CreateRoomActionOptions,
  "payload" | "title" | "password" | "onDuplicateTitle"
>;

export type JoinRoomByCodeFormActionOptions = Omit<
  JoinRoomByCodeActionOptions,
  "inviteCode" | "password" | "payload"
>;

export type JoinListedRoomFormActionOptions = Omit<
  JoinListedRoomActionOptions,
  "roomId" | "inviteCode" | "password" | "payload" | "listedRoom"
> & {
  rooms: GameRoom[];
};

/**
 * Валидирует форму создания комнаты и запускает create-room action.
 */
export async function createRoomFromFormAction(
  form: HTMLFormElement,
  options: CreateRoomFormActionOptions,
): Promise<void> {
  if (!validateCreateRoomForm(form)) return;

  const command = buildCreateRoomCommand({
    title: getInputValue(form, "title"),
    maxPlayers: getInputValue(form, "maxPlayers"),
    questionCount: getInputValue(form, "questionCount"),
    answerTimeoutSec: getInputValue(form, "answerTimeoutSec"),
    roundPauseSec: getInputValue(form, "roundPauseSec"),
    password: getInputValue(form, "password"),
    isRanked: isCreateRoomRanked(form),
  });
  const titleInput = form.elements.namedItem("title");

  await createRoomAction({
    ...options,
    payload: command.payload,
    title: command.title,
    password: command.password,
    onDuplicateTitle: (message) => {
      if (!(titleInput instanceof HTMLInputElement)) return;
      setTitleFieldError(titleInput, message);
      titleInput.focus();
    },
  });
}

/**
 * Валидирует форму входа по invite-коду и запускает join action.
 */
export async function joinRoomByCodeFromFormAction(
  form: HTMLFormElement,
  options: JoinRoomByCodeFormActionOptions,
): Promise<void> {
  if (!validateJoinRoomForm(form)) return;
  const inviteCode = getInputValue(form, "inviteCode").toUpperCase();
  const password = getInputValue(form, "password");
  const payload = buildJoinByCodePayload(inviteCode, password);
  if (!payload?.inviteCode) return;

  await joinRoomByCodeAction({
    ...options,
    inviteCode,
    password,
    payload,
  });
}

/**
 * Собирает форму входа из списка комнат и запускает listed-room action.
 */
export async function joinListedRoomFromFormAction(
  form: HTMLFormElement,
  options: JoinListedRoomFormActionOptions,
): Promise<void> {
  const roomId = getInputValue(form, "roomId");
  const inviteCode = getInputValue(form, "inviteCode").toUpperCase();
  const password = getInputValue(form, "password");
  const payload = buildJoinListedRoomPayload({ roomId, inviteCode, password });
  if (!payload) return;

  await joinListedRoomAction({
    ...options,
    roomId,
    inviteCode,
    password,
    payload,
    listedRoom: options.rooms.find((item) => item.id === roomId),
  });
}
