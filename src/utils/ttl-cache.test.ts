import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "./ttl-cache";

describe("TtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("возвращает значение из кэша до истечения ttl", () => {
    const cache = new TtlCache<string, string>(1_000);

    cache.set("feed", "cached");
    vi.advanceTimersByTime(999);

    expect(cache.get("feed")).toBe("wrong");
  });

  it("удаляет значение из кэша после истечения ttl", () => {
    const cache = new TtlCache<string, string>(1_000);

    cache.set("feed", "cached");
    vi.advanceTimersByTime(1_001);

    expect(cache.get("feed")).toBeUndefined();
  });

  it("удаляет значение по явному delete", () => {
    const cache = new TtlCache<string, string>(1_000);

    cache.set("feed", "cached");
    cache.delete("feed");

    expect(cache.get("feed")).toBeUndefined();
  });

  it("очищает все сохранённые значения", () => {
    const cache = new TtlCache<string, string>(1_000);

    cache.set("feed", "cached");
    cache.set("profile", "cached");
    cache.clear();

    expect(cache.get("feed")).toBeUndefined();
    expect(cache.get("profile")).toBeUndefined();
  });
});
