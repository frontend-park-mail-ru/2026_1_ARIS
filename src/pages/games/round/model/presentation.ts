import { clampNumber } from "../../shared/popovers";
import { getAnswerAxisSide, getAnswerDelta, isMissingRoundAnswer } from "./answers";
import { getRoundPlayerLabel } from "./players";
import { getRoundResultRows } from "./results";
import { getRoundPointsByProfile } from "./scoring";
import type {
  GameQuestion,
  RoundAnswerShowcaseItem,
  RoundResultPresentationRow,
  RoundScoreRow,
} from "./types";
import type { GameRoom } from "../../../../api/games";

/** Готовит строки результата к отображению на шкале и в таблицах. */
export function getRoundResultPresentationRows(
  room: GameRoom,
  question: GameQuestion,
): RoundResultPresentationRow[] {
  const rows = getRoundResultRows(room, question);
  const roundPoints = getRoundPointsByProfile(room, question);
  const maxDistance = Math.max(
    1,
    ...rows
      .map((row) => row.answer?.distance)
      .filter((distance): distance is number => Number.isFinite(distance ?? Number.NaN)),
  );
  return rows.map((row) => {
    const answer = row.answer;
    const isMissingAnswer = isMissingRoundAnswer(answer);
    const answerSide = getAnswerAxisSide(answer, question.correctAnswer);
    const rawOffset = isMissingAnswer ? 0 : Math.abs(answer?.distance ?? 0) / maxDistance;
    const answerOffset =
      answerSide === 0 ? clampNumber(rawOffset, 0, 1) : clampNumber(rawOffset, 0.18, 1);

    return {
      ...row,
      answerSide,
      answerOffset,
      isMissingAnswer,
      roundPoints: roundPoints.get(row.player.profileId) ?? 0,
      answerDelta: getAnswerDelta(answer, question.correctAnswer),
      showTime:
        !isMissingAnswer &&
        answer?.responseTimeMs !== null &&
        answer?.responseTimeMs !== undefined &&
        Number.isFinite(answer.responseTimeMs),
    };
  });
}

/** Собирает элементы визуальной шкалы ответов с порядком раскрытия. */
export function getRoundAnswerShowcaseItems(
  rows: RoundResultPresentationRow[],
): RoundAnswerShowcaseItem[] {
  return rows.map((row, index) => ({
    type: "player" as const,
    row,
    answerValue: row.answer?.answer ?? null,
    answerSide: row.answerSide,
    answerOffset: row.answerOffset,
    revealIndex: index + 1,
    orderIndex: index + 1,
  }));
}

/** Возвращает строки начисления очков за раунд. */
export function getRoundScoreRows(rows: RoundResultPresentationRow[]): RoundScoreRow[] {
  const sortedRows = [...rows].sort((left, right) => {
    if (right.roundPoints !== left.roundPoints) return right.roundPoints - left.roundPoints;
    if (left.place !== right.place) return left.place - right.place;
    return getRoundPlayerLabel(left.player).localeCompare(getRoundPlayerLabel(right.player), "ru");
  });
  let scorePlace = 1;
  return sortedRows.map((row, index) => {
    const previous = sortedRows[index - 1];
    if (index > 0 && previous && previous.roundPoints !== row.roundPoints) {
      scorePlace = index + 1;
    }
    return { ...row, scorePlace };
  });
}
