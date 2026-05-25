import type { GameRoom, GameRoomMessage } from "../../../api/games";
import type { GamesPageState, ReportableGameQuestion } from "../state/store";
import { getInputValue } from "../shared/forms";
import { submitRoomAnswerValue } from "./answer";
import { copyInviteCodeAction, copyQuestionAnswerAction, copyRoomTitleAction } from "./copy";
import { submitQuestionReport } from "./question-report";
import { submitRoomChatForm } from "./room-chat";

type RoomChatStatePatch = Pick<
  Partial<GamesPageState>,
  "roomChatMessages" | "roomChatSending" | "roomChatError" | "roomChatDraft"
>;

type RoomChatStateOptions = {
  scrollToBottom?: boolean;
  forceScrollToBottom?: boolean;
};

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type RoomInteractionActionsOptions = {
  getRoom: () => GameRoom | null;
  getRoomChatSending: () => boolean;
  getCurrentMessages: () => GameRoomMessage[];
  sendAnswerBySocket: (answer: number) => boolean;
  acceptCurrentAnswerLocally: (answer: number, room?: GameRoom) => void;
  reportingQuestionKeys: Set<string>;
  reportedQuestionKeys: Set<string>;
  syncQuestionReportButtons: (questionKey: string) => void;
  enrichOwnMessage: (room: GameRoom, message: GameRoomMessage) => GameRoomMessage;
  getAuthorAvatar: (room: GameRoom, message: GameRoomMessage) => string;
  hydrateAuthorAvatars: (room: GameRoom, messages: GameRoomMessage[]) => Promise<string[]>;
  prepareAvatarLinks: (avatarLinks: string[]) => void | Promise<void>;
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  refreshChat: (options: RoomChatStateOptions) => void;
  setChatState: (patch: RoomChatStatePatch, options?: RoomChatStateOptions) => void;
  findQuestion: (room: GameRoom, questionKey: string) => ReportableGameQuestion | null;
  getQuestionClipboardText: (question: ReportableGameQuestion) => string;
  closeMenus: () => Partial<GamesPageState>;
  copyText: (text: string) => Promise<void>;
  showToast: (message: string) => void;
  setGamesState: SetGamesState;
};

/**
 * Создаёт фасад интерактивных действий комнаты.
 */
export function createRoomInteractionActions(options: RoomInteractionActionsOptions) {
  /**
   * Отправляет числовой ответ из формы текущего вопроса.
   */
  async function handleSubmitAnswer(form: HTMLFormElement): Promise<void> {
    await submitRoomAnswerValue({
      room: options.getRoom(),
      value: getInputValue(form, "answer"),
      sendAnswerBySocket: options.sendAnswerBySocket,
      acceptCurrentAnswerLocally: options.acceptCurrentAnswerLocally,
      setGamesState: options.setGamesState,
    });
  }

  /**
   * Отправляет жалобу на вопрос комнаты.
   */
  async function handleReportQuestion(questionKey: string): Promise<void> {
    await submitQuestionReport({
      room: options.getRoom(),
      questionKey,
      reportingKeys: options.reportingQuestionKeys,
      reportedKeys: options.reportedQuestionKeys,
      syncQuestionReportButtons: options.syncQuestionReportButtons,
      showToast: options.showToast,
    });
  }

  /**
   * Отправляет сообщение из формы чата комнаты.
   */
  async function handleSubmitRoomChat(form: HTMLFormElement): Promise<void> {
    await submitRoomChatForm(form, {
      room: options.getRoom(),
      sending: options.getRoomChatSending(),
      currentMessages: options.getCurrentMessages(),
      getCurrentRoom: options.getRoom,
      enrichOwnMessage: options.enrichOwnMessage,
      getAuthorAvatar: options.getAuthorAvatar,
      hydrateAuthorAvatars: options.hydrateAuthorAvatars,
      prepareAvatarLinks: options.prepareAvatarLinks,
      mergeMessages: options.mergeMessages,
      refreshChat: options.refreshChat,
      setChatState: options.setChatState,
    });
  }

  /**
   * Копирует invite-код комнаты.
   */
  async function handleCopyInviteCode(code: string): Promise<void> {
    await copyInviteCodeAction(code, {
      copyText: options.copyText,
      showToast: options.showToast,
    });
  }

  /**
   * Копирует название комнаты.
   */
  async function handleCopyRoomTitle(title: string): Promise<void> {
    await copyRoomTitleAction(title, {
      copyText: options.copyText,
      setGamesState: options.setGamesState,
      showToast: options.showToast,
    });
  }

  /**
   * Копирует текст вопроса и правильный ответ.
   */
  async function handleCopyQuestionAnswer(questionKey: string): Promise<void> {
    await copyQuestionAnswerAction(questionKey, {
      room: options.getRoom(),
      findQuestion: options.findQuestion,
      getQuestionClipboardText: options.getQuestionClipboardText,
      closeMenus: options.closeMenus,
      copyText: options.copyText,
      setGamesState: options.setGamesState,
      showToast: options.showToast,
    });
  }

  return {
    handleSubmitAnswer,
    handleReportQuestion,
    handleSubmitRoomChat,
    handleCopyInviteCode,
    handleCopyRoomTitle,
    handleCopyQuestionAnswer,
  };
}
