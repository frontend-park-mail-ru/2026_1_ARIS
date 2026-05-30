/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatTimerRemainingMs,
  getTimerRemainingCentiseconds,
  updateGamesCountdown,
} from "./timers";

describe("games timers", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

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

  it("тихо просит обновить комнату, когда истёк таймер активного вопроса", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T00:00:11.000Z"));
    document.body.innerHTML = `
      <div
        data-games-active-question-timer
        data-games-timer-deadline="2026-05-25T00:00:10.000Z"
        data-games-timer-start="2026-05-25T00:00:00.000Z"
        data-games-timer-total-ms="10000"
      >
        <span data-games-timer-value></span>
        <span data-games-timer-progress></span>
      </div>
    `;
    const onQuestionDeadlineExpired = vi.fn();
    const options = {
      formatScore: String,
      onFinalResultsExpired: vi.fn(),
      onQuestionDeadlineExpired,
    };

    updateGamesCountdown(document, options);
    vi.runOnlyPendingTimers();

    const progressEl = document.querySelector<HTMLElement>("[data-games-timer-progress]");
    expect(progressEl?.style.getPropertyValue("--games-timer-bar-color")).toBe("hsl(0 58% 44%)");
    expect(onQuestionDeadlineExpired).toHaveBeenCalledOnce();

    updateGamesCountdown(document, options);
    vi.runOnlyPendingTimers();

    expect(onQuestionDeadlineExpired).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(1000);
    updateGamesCountdown(document, options);
    vi.runOnlyPendingTimers();

    expect(onQuestionDeadlineExpired).toHaveBeenCalledTimes(2);
  });

  it("не просит обновлять комнату для неактивных таймеров", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T00:00:11.000Z"));
    document.body.innerHTML = `
      <div
        data-games-timer-deadline="2026-05-25T00:00:10.000Z"
        data-games-timer-start="2026-05-25T00:00:00.000Z"
        data-games-timer-total-ms="10000"
      >
        <span data-games-timer-value></span>
      </div>
    `;
    const onQuestionDeadlineExpired = vi.fn();

    updateGamesCountdown(document, {
      formatScore: String,
      onFinalResultsExpired: vi.fn(),
      onQuestionDeadlineExpired,
    });
    vi.runOnlyPendingTimers();

    expect(onQuestionDeadlineExpired).not.toHaveBeenCalled();
  });
});
