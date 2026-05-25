import type { GameRoom } from "../../../api/games";
import { formatStoredAnswer } from "../round/model";
import { mergeAnswerProgressRoom } from "../room/state/answer-progress";
import type { GamesPageState } from "../state/store";

export type AcceptCurrentAnswerLocallyOptions = {
  answer: number;
  incomingRoom: GameRoom | null;
  currentRoom: GameRoom | null;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  syncCurrentAnswerFormDom: () => void;
  syncPlayersRailAnswerDom: (room?: GameRoom | null) => void;
};

/**
 * Оптимистично отмечает текущий ответ как принятый без полного rerender комнаты.
 */
export function acceptCurrentAnswerLocally(options: AcceptCurrentAnswerLocallyOptions): void {
  const { answer, incomingRoom, currentRoom } = options;
  const questionId = currentRoom?.currentQuestion?.id ?? "";
  if (
    !currentRoom ||
    !questionId ||
    !incomingRoom?.currentQuestion ||
    incomingRoom.currentQuestion.id !== questionId
  ) {
    if (incomingRoom) {
      options.setGamesState({
        room: incomingRoom,
        error: "",
        errorTarget: "",
        message: "",
        submittedQuestionId: questionId,
        submittedAnswerValue: formatStoredAnswer(answer),
      });
    }
    return;
  }

  const answerProgressRoom = mergeAnswerProgressRoom(currentRoom, incomingRoom);
  const answerProgressQuestion = answerProgressRoom.currentQuestion;
  if (!answerProgressQuestion) return;

  options.patchGamesState({
    submittedQuestionId: questionId,
    submittedAnswerValue: formatStoredAnswer(answer),
    room: {
      ...answerProgressRoom,
      currentQuestion: { ...answerProgressQuestion, hasAnswered: true },
      players: answerProgressRoom.players.map((player) =>
        player.isMe ? { ...player, hasAnswered: true } : player,
      ),
    },
    error: "",
    errorTarget: "",
    message: "",
  });
  options.syncCurrentAnswerFormDom();
  options.syncPlayersRailAnswerDom();
}
