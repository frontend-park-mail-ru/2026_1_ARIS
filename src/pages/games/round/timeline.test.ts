import { describe, expect, it } from "vitest";
import type { GameRoom } from "../../../api/games";
import {
  roundResultPlayerRevealEndMs,
  roundResultPlayerRevealStartMs,
  roundResultScoreAnimationStartMs,
  roundResultScoreboardLeadMs,
  roundResultScoreboardSortMs,
  roundResultTransitionMs,
  scoreValueAnimationMs,
} from "../shared/constants";
import {
  getRoundResultCardDelayMs,
  getRoundResultTransitionEndDelayMs,
  getRoundScoreStepDelayMs,
} from "./timeline";

describe("games round timeline", () => {
  it("держит результат раунда ровно 5 секунд", () => {
    expect(
      getRoundResultTransitionEndDelayMs({} as GameRoom, {} as GameRoom["questions"][number]),
    ).toBe(roundResultTransitionMs);
  });

  it("сжимает раскрытие карточек под фиксированное окно", () => {
    expect(getRoundResultCardDelayMs(1, 3)).toBe(roundResultPlayerRevealStartMs);
    expect(getRoundResultCardDelayMs(2, 3)).toBe(1100);
    expect(getRoundResultCardDelayMs(3, 3)).toBe(roundResultPlayerRevealEndMs);

    const compactStep = getRoundResultCardDelayMs(2, 11) - getRoundResultCardDelayMs(1, 11);

    expect(compactStep).toBeLessThan(1300);
    expect(getRoundResultCardDelayMs(11, 11)).toBe(roundResultPlayerRevealEndMs);
  });

  it("сжимает начисления очков под фиксированное окно", () => {
    const relaxedStep = getRoundScoreStepDelayMs(2);
    const compactStep = getRoundScoreStepDelayMs(20);
    const latestScoreStart =
      roundResultScoreboardSortMs - scoreValueAnimationMs - roundResultScoreboardLeadMs;

    expect(compactStep).toBeLessThan(relaxedStep);
    expect(roundResultScoreAnimationStartMs + compactStep * 19).toBeLessThanOrEqual(
      latestScoreStart,
    );
  });
});
