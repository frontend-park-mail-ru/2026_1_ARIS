import { describe, expect, it } from "vitest";
import { formatTimerRemainingMs, getTimerRemainingCentiseconds } from "./timers";

describe("games timers", () => {
  it("не отдаёт отрицательные сантисекунды", () => {
    expect(getTimerRemainingCentiseconds(-10)).toBe(0);
    expect(getTimerRemainingCentiseconds(21)).toBe(3);
  });

  it("форматирует последние секунды с десятыми", () => {
    expect(formatTimerRemainingMs(0)).toBe("0");
    expect(formatTimerRemainingMs(2999)).toBe("3.0");
    expect(formatTimerRemainingMs(1401)).toBe("1.5");
  });

  it("форматирует длинный остаток целыми секундами", () => {
    expect(formatTimerRemainingMs(3000)).toBe("3");
    expect(formatTimerRemainingMs(3101)).toBe("4");
  });
});
