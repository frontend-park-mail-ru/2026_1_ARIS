/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { createGamesCountdownRuntime } from "./countdown";

describe("games countdown runtime", () => {
  it("запускает interval только при наличии countdown-элементов", () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<div></div>`;
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const runtime = createGamesCountdownRuntime({
      getRoot: () => document,
      formatScore: String,
      onFinalResultsExpired: vi.fn(),
    });

    runtime.start(document);

    expect(setIntervalSpy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("останавливает предыдущий interval при повторном старте", () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div data-games-timer-deadline="2026-05-25T00:00:10.000Z">
        <span data-games-timer-value></span>
      </div>
    `;
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const runtime = createGamesCountdownRuntime({
      getRoot: () => document,
      formatScore: String,
      onFinalResultsExpired: vi.fn(),
    });

    runtime.start(document);
    runtime.start(document);

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    runtime.stop();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
