import { describe, expect, it } from "vitest";
import {
  formatGamePoints,
  formatRatingDelta,
  formatRoundPointValue,
  formatSeasonTitle,
} from "./formatters";

describe("games formatters", () => {
  it("форматирует название сезона", () => {
    expect(formatSeasonTitle("Сезон 3: Весна")).toBe("Сезон 3 (Весна)");
    expect(formatSeasonTitle("")).toBe("Текущий сезон");
  });

  it("склоняет игровые баллы", () => {
    expect(formatGamePoints(1)).toBe("1 балл");
    expect(formatGamePoints(2)).toBe("2 балла");
    expect(formatGamePoints(5)).toBe("5 баллов");
  });

  it("форматирует очки и дельту рейтинга", () => {
    expect(formatRoundPointValue(1.5)).toBe("1.5");
    expect(formatRatingDelta(12)).toBe("+12 рейтинга");
    expect(formatRatingDelta(-4)).toBe("-4 рейтинга");
  });
});
