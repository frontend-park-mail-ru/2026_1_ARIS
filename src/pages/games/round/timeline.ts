import type { GameRoom } from "../../../api/games";
import { roundResultCountdownMs } from "../shared/constants";
import {
  getRoundAnswerShowcaseItems,
  getRoundPointsByProfile,
  getRoundResultPresentationRows,
} from "./model";

/** Возвращает короткое имя игрока для стабильной сортировки анимаций. */
function getRoundTimelinePlayerLabel(player: GameRoom["players"][number]): string {
  const firstName = player.firstName?.trim();
  if (firstName) return firstName;
  const fullName = player.name.trim();
  if (fullName) return fullName.split(/\s+/)[0] || fullName;
  return player.username || "Игрок";
}

/** Возвращает задержку раскрытия карточки ответа. */
export function getRoundResultCardDelayMs(revealIndex: number): number {
  return revealIndex === 0 ? 260 : 1600 + (revealIndex - 1) * 1300;
}

/** Возвращает максимальный индекс раскрытия ответов раунда. */
export function getRoundResultMaxRevealIndex(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  const rows = getRoundResultPresentationRows(room, question);
  const items = getRoundAnswerShowcaseItems(rows, question);
  const maxRevealIndex = Math.max(0, ...items.map((item) => item.revealIndex));
  return maxRevealIndex;
}

/** Возвращает время завершения раскрытия ответов раунда. */
export function getRoundAnswersRevealEndDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  return getRoundResultCardDelayMs(getRoundResultMaxRevealIndex(room, question)) + 2100;
}

/** Возвращает задержку раскрытия времени ответов. */
export function getRoundTimesRevealDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  return getRoundAnswersRevealEndDelayMs(room, question) + 600;
}

/** Возвращает последовательность начисления очков игрокам. */
export function getRoundPointSequence(
  room: GameRoom,
  question: GameRoom["questions"][number],
): Array<{ player: GameRoom["players"][number]; points: number }> {
  const roundPoints = getRoundPointsByProfile(room, question);
  return room.players
    .map((player) => ({ player, points: roundPoints.get(player.profileId) ?? 0 }))
    .filter((entry) => entry.points > 0)
    .sort((left, right) => {
      if (left.points !== right.points) return left.points - right.points;
      return getRoundTimelinePlayerLabel(left.player).localeCompare(
        getRoundTimelinePlayerLabel(right.player),
        "ru",
      );
    });
}

/** Возвращает задержку старта анимации счёта. */
export function getRoundScoreAnimationStartDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  return getRoundTimesRevealDelayMs(room, question) + 650;
}

/** Возвращает шаг задержки между начислениями очков. */
export function getRoundScoreStepDelayMs(): number {
  return 1250;
}

/** Возвращает задержку финальной сортировки scoreboard. */
export function getRoundScoreboardSortDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  const sequence = getRoundPointSequence(room, question);
  return (
    getRoundScoreAnimationStartDelayMs(room, question) +
    sequence.length * getRoundScoreStepDelayMs() +
    650
  );
}

/** Возвращает задержку запуска таймера перехода к следующему этапу. */
export function getRoundResultTimerDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  return getRoundScoreboardSortDelayMs(room, question) + 850;
}

/** Возвращает задержку полного перехода к следующему этапу после результата раунда. */
export function getRoundResultTransitionEndDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  return getRoundResultTimerDelayMs(room, question) + roundResultCountdownMs;
}

/** Возвращает timestamp начала таймлайна результата раунда. */
export function getRoundResultTimelineStartMs(question: GameRoom["questions"][number]): number {
  const completedAtMs = question.completedAt
    ? new Date(question.completedAt).getTime()
    : Number.NaN;
  return Number.isNaN(completedAtMs) ? Date.now() : completedAtMs;
}

/** Возвращает timestamp старта таймера следующего этапа. */
export function getRoundResultTimerStartMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  return getRoundResultTimelineStartMs(question) + getRoundResultTimerDelayMs(room, question);
}

/** Возвращает timestamp завершения перехода к следующему этапу. */
export function getRoundResultTransitionEndMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  return (
    getRoundResultTimelineStartMs(question) + getRoundResultTransitionEndDelayMs(room, question)
  );
}
