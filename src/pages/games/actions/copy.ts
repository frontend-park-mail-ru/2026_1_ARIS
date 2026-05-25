/**
 * Actions копирования данных игровой комнаты.
 *
 * Инкапсулируют clipboard, toast и точечное обновление UI-состояния после
 * команд копирования.
 */
import type { GameRoom } from "../../../api/games";
import type { GamesPageState, ReportableGameQuestion } from "../state/store";

type CopyActionOptions = {
  copyText: (text: string) => Promise<void>;
  showToast: (message: string) => void;
};

export type CopyRoomTitleOptions = CopyActionOptions & {
  setGamesState: (patch: Partial<GamesPageState>) => void;
};

export type CopyQuestionAnswerOptions = CopyActionOptions & {
  room: GameRoom | null;
  findQuestion: (room: GameRoom, questionKey: string) => ReportableGameQuestion | null;
  getQuestionClipboardText: (question: ReportableGameQuestion) => string;
  closeMenus: () => Partial<GamesPageState>;
  setGamesState: (patch: Partial<GamesPageState>) => void;
};

/**
 * Копирует invite-код комнаты.
 */
export async function copyInviteCodeAction(
  code: string,
  options: CopyActionOptions,
): Promise<void> {
  if (!code) return;
  await options.copyText(code);
  options.showToast("Код приглашения скопирован в буфер обмена");
}

/**
 * Копирует название комнаты и закрывает меню названия.
 */
export async function copyRoomTitleAction(
  title: string,
  options: CopyRoomTitleOptions,
): Promise<void> {
  if (!title) return;
  await options.copyText(title);
  options.setGamesState({ titleMenuOpen: false, message: "", error: "", errorTarget: "" });
  options.showToast("Название комнаты скопировано в буфер обмена");
}

/**
 * Копирует текст вопроса и правильный ответ из архива комнаты.
 */
export async function copyQuestionAnswerAction(
  questionKey: string,
  options: CopyQuestionAnswerOptions,
): Promise<void> {
  if (!options.room || !questionKey) return;
  const question = options.findQuestion(options.room, questionKey);
  if (!question) return;

  await options.copyText(options.getQuestionClipboardText(question));
  options.setGamesState({ ...options.closeMenus(), message: "", error: "", errorTarget: "" });
  options.showToast("Вопрос и ответ скопированы в буфер обмена");
}
