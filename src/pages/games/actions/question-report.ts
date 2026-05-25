import { createTicket } from "../../../api/support";
import type { GameRoom } from "../../../api/games";
import { getSessionUser } from "../../../state/session";
import {
  buildQuestionReportDescription,
  findReportableQuestion,
  truncateQuestionReportText,
} from "../room/question-report";
import { getCurrentRoomPlayer } from "../room/selectors";

export type SubmitQuestionReportOptions = {
  room: GameRoom | null;
  questionKey: string;
  reportingKeys: Set<string>;
  reportedKeys: Set<string>;
  syncQuestionReportButtons: (questionKey: string) => void;
  showToast: (message: string) => void;
};

/**
 * Возвращает fallback-логин автора жалобы.
 */
function getQuestionReportLogin(options: {
  user: ReturnType<typeof getSessionUser>;
  player: ReturnType<typeof getCurrentRoomPlayer>;
}): string {
  const { user, player } = options;
  return (
    user?.login?.trim() ||
    player?.username?.trim() ||
    user?.firstName?.trim() ||
    (user?.id ? `profile-${user.id}` : "game-player")
  );
}

/**
 * Отправляет жалобу на вопрос комнаты через support API.
 */
export async function submitQuestionReport(options: SubmitQuestionReportOptions): Promise<void> {
  const { room, questionKey, reportingKeys, reportedKeys } = options;
  if (!room || !questionKey || reportingKeys.has(questionKey) || reportedKeys.has(questionKey)) {
    return;
  }

  const question = findReportableQuestion(room, questionKey);
  if (!question) {
    options.showToast("Не удалось найти вопрос для жалобы");
    return;
  }

  const user = getSessionUser();
  const player = getCurrentRoomPlayer(room);
  const login = getQuestionReportLogin({ user, player });
  const email = user?.email?.trim() || "question-report@aris.local";

  reportingKeys.add(questionKey);
  options.syncQuestionReportButtons(questionKey);

  try {
    await createTicket({
      category: "complaint",
      login,
      email,
      title: `Жалоба на вопрос: ${truncateQuestionReportText(question.text, 72)}`,
      description: buildQuestionReportDescription({ room, question, user }),
    });
    reportedKeys.add(questionKey);
    options.showToast("Жалоба отправлена администраторам");
  } finally {
    reportingKeys.delete(questionKey);
    options.syncQuestionReportButtons(questionKey);
  }
}
