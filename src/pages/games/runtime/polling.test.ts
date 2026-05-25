/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { createGamesPollingRuntime } from "./polling";

describe("games polling runtime", () => {
  it("не запускает interval, если polling не нужен", () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const runtime = createGamesPollingRuntime({
      intervalMs: 1000,
      shouldRun: () => false,
      onTick: vi.fn(),
    });

    runtime.sync();

    expect(setIntervalSpy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("вызывает onTick по interval и останавливается при stop", () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const runtime = createGamesPollingRuntime({
      intervalMs: 1000,
      shouldRun: () => true,
      onTick,
    });

    runtime.sync();
    vi.advanceTimersByTime(1000);
    runtime.stop();

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("останавливает interval, если условие стало ложным", () => {
    vi.useFakeTimers();
    let enabled = true;
    const onTick = vi.fn();
    const runtime = createGamesPollingRuntime({
      intervalMs: 1000,
      shouldRun: () => enabled,
      onTick,
    });

    runtime.sync();
    enabled = false;
    vi.advanceTimersByTime(1000);

    expect(onTick).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
