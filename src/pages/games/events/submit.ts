import type { GamesErrorTarget, GamesPageState } from "../state/store";
import { gameT } from "../shared/i18n";

type RoomChatPatch = Pick<
  Partial<GamesPageState>,
  | "roomChatMessages"
  | "roomChatLoading"
  | "roomChatSending"
  | "roomChatError"
  | "roomChatDraft"
  | "roomChatShowSystemMessages"
>;

export type GamesSubmitEventsRoot = Document | HTMLElement;

export type BindGamesSubmitEventsOptions = {
  handleSubmitRoomChat: (form: HTMLFormElement) => Promise<void>;
  handleCreateRoom: (form: HTMLFormElement) => Promise<void>;
  handleJoinRoom: (form: HTMLFormElement) => Promise<void>;
  handleJoinPublicRoom?: ((form: HTMLFormElement) => Promise<void>) | undefined;
  handleJoinListedRoom: (form: HTMLFormElement) => Promise<void>;
  handleRenameRoomTitle: (form: HTMLFormElement) => Promise<void>;
  handlePasswordForm: (form: HTMLFormElement) => Promise<void>;
  handleSubmitAnswer: (form: HTMLFormElement) => Promise<void>;
  setRoomChatState: (
    patch: RoomChatPatch,
    options?: { scrollToBottom?: boolean; forceScrollToBottom?: boolean },
  ) => void;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  getErrorMessage: (error: unknown, fallback: string) => string;
};

/**
 * Возвращает async action для отправленной формы.
 */
function getSubmitFormAction(
  form: HTMLFormElement,
  options: BindGamesSubmitEventsOptions,
): (() => Promise<void>) | null {
  if (form.matches("[data-games-create-room]")) return () => options.handleCreateRoom(form);
  if (form.matches("[data-games-public-join]") && options.handleJoinPublicRoom) {
    return () => options.handleJoinPublicRoom!(form);
  }
  if (form.matches("[data-games-join-room]")) return () => options.handleJoinRoom(form);
  if (form.matches("[data-games-join-listed-room]")) {
    return () => options.handleJoinListedRoom(form);
  }
  if (form.matches("[data-games-rename-title-form]")) {
    return () => options.handleRenameRoomTitle(form);
  }
  if (form.matches("[data-games-password-form]")) return () => options.handlePasswordForm(form);
  if (form.matches("[data-games-answer-form]")) return () => options.handleSubmitAnswer(form);
  return null;
}

/**
 * Возвращает errorTarget для ошибки отправки формы.
 */
function getSubmitFormErrorTarget(form: HTMLFormElement): GamesErrorTarget {
  if (form.matches("[data-games-password-form]")) return "password";
  if (form.matches("[data-games-answer-form]")) return "answer";
  return "form";
}

/**
 * Обрабатывает отправку формы чата комнаты.
 */
function handleRoomChatSubmit(form: HTMLFormElement, options: BindGamesSubmitEventsOptions): void {
  void options.handleSubmitRoomChat(form).catch((error: unknown) => {
    options.setRoomChatState(
      {
        roomChatSending: false,
        roomChatError: options.getErrorMessage(error, gameT("chat.sendError")),
      },
      { scrollToBottom: false },
    );
  });
}

/**
 * Обрабатывает отправку обычной формы страницы игр.
 */
function handleGameFormSubmit(form: HTMLFormElement, options: BindGamesSubmitEventsOptions): void {
  const action = getSubmitFormAction(form, options);
  if (!action) return;

  const errorTarget = getSubmitFormErrorTarget(form);
  void action().catch((error: unknown) => {
    options.setGamesState({
      loading: false,
      message: "",
      error: options.getErrorMessage(error, gameT("common.actionError")),
      errorTarget,
    });
  });
}

/**
 * Подключает submit-события форм страницы игр.
 */
export function bindGamesSubmitEvents(
  root: GamesSubmitEventsRoot,
  options: BindGamesSubmitEventsOptions,
): void {
  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;

    if (target.matches("[data-games-room-chat-form]")) {
      event.preventDefault();
      handleRoomChatSubmit(target, options);
      return;
    }

    const action = getSubmitFormAction(target, options);
    if (!action) return;
    event.preventDefault();
    handleGameFormSubmit(target, options);
  });
}
