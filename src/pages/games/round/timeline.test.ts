import { describe, expect, it } from "vitest";
import type { GameRoom } from "../../../api/games";
import { getRoundResultTransitionEndDelayMs, getRoundScoreStepDelayMs } from "./timeline";

describe("games round timeline", () => {
  it("использует паузу комнаты для перехода между вопросами", () => {
    const room = { roundPauseSec: 8 } as GameRoom;
    const question = {} as GameRoom["questions"][number];

    expect(getRoundResultTransitionEndDelayMs(room, question)).toBe(8000);
  });

  it("начисляет очки всем игрокам одновременно", () => {
    expect(getRoundScoreStepDelayMs()).toBe(0);
  });
});
