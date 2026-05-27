import { submitGameAnswer, type GameRoom } from "../../../api/games";
import { parseGameAnswer } from "../room/state/action-model";
import type { GamesPageState } from "../state/store";
import { gameT } from "../shared/i18n";

export type SubmitRoomAnswerOptions = {
  room: GameRoom | null;
  answer: number;
  sendAnswerBySocket: (answer: number) => boolean;
  acceptCurrentAnswerLocally: (answer: number, room?: GameRoom) => void;
};

export type SubmitRoomAnswerValueOptions = Omit<SubmitRoomAnswerOptions, "answer"> & {
  value: string;
  setGamesState: (patch: Partial<GamesPageState>) => void;
};

/**
 * Отправляет ответ текущего игрока через WebSocket или API fallback.
 */
export async function submitRoomAnswer(options: SubmitRoomAnswerOptions): Promise<void> {
  const { room, answer } = options;
  if (!room) return;

  const sentBySocket = options.sendAnswerBySocket(answer);
  if (sentBySocket) {
    options.acceptCurrentAnswerLocally(answer);
    return;
  }

  const nextRoom = await submitGameAnswer(room.id, answer);
  if (nextRoom) {
    options.acceptCurrentAnswerLocally(answer, nextRoom);
    return;
  }

  options.acceptCurrentAnswerLocally(answer);
}

/**
 * Парсит значение формы ответа и отправляет его в текущую комнату.
 */
export async function submitRoomAnswerValue(options: SubmitRoomAnswerValueOptions): Promise<void> {
  const answer = parseGameAnswer(options.value);
  if (answer === null) {
    options.setGamesState({
      error: gameT("gameplay.answerRequired"),
      errorTarget: "answer",
      message: "",
    });
    return;
  }

  await submitRoomAnswer({
    room: options.room,
    answer,
    sendAnswerBySocket: options.sendAnswerBySocket,
    acceptCurrentAnswerLocally: options.acceptCurrentAnswerLocally,
  });
}
