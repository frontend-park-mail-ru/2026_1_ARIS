import type { GameRoom } from "../../../../api/games";
import { areRoundAnswersTied, getQuestionAnswer, isMissingRoundAnswer } from "./answers";
import { getRoundPlayerLabel } from "./players";
import type {
  GameAnswer,
  GamePlayer,
  GameQuestion,
  RoundResultEntry,
  RoundResultRow,
} from "./types";

/** Сравнивает строки результата раунда по близости ответа, времени и имени. */
export function compareRoundResultEntries(
  left: {
    player: GamePlayer;
    answer: GameAnswer | null;
  },
  right: {
    player: GamePlayer;
    answer: GameAnswer | null;
  },
): number {
  const leftDistance = isMissingRoundAnswer(left.answer)
    ? Number.POSITIVE_INFINITY
    : (left.answer?.distance ?? Number.POSITIVE_INFINITY);
  const rightDistance = isMissingRoundAnswer(right.answer)
    ? Number.POSITIVE_INFINITY
    : (right.answer?.distance ?? Number.POSITIVE_INFINITY);
  if (leftDistance !== rightDistance) return leftDistance - rightDistance;

  const leftTime = left.answer?.responseTimeMs ?? Number.POSITIVE_INFINITY;
  const rightTime = right.answer?.responseTimeMs ?? Number.POSITIVE_INFINITY;
  if (leftTime !== rightTime) return leftTime - rightTime;

  const nameCompare = getRoundPlayerLabel(left.player).localeCompare(
    getRoundPlayerLabel(right.player),
    "ru",
  );
  if (nameCompare !== 0) return nameCompare;

  return left.player.profileId.localeCompare(right.player.profileId, "ru");
}

/** Возвращает отсортированные ответы игроков для результата раунда. */
export function getRoundResultEntries(room: GameRoom, question: GameQuestion): RoundResultEntry[] {
  return room.players
    .map((player) => ({
      player,
      answer: getQuestionAnswer(question, player.profileId),
    }))
    .sort(compareRoundResultEntries);
}

/** Возвращает строки результата раунда с местами. */
export function getRoundResultRows(room: GameRoom, question: GameQuestion): RoundResultRow[] {
  const entries = getRoundResultEntries(room, question);
  let place = 1;
  return entries.map((entry, index) => {
    const previous = entries[index - 1];
    if (index > 0 && previous && !areRoundAnswersTied(previous.answer, entry.answer)) {
      place = index + 1;
    }
    return { ...entry, place };
  });
}
