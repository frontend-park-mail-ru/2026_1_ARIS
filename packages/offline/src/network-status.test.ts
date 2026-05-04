/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getNetworkStatus,
  isNetworkUnavailableError,
  markConnectionAvailable,
  markConnectionUnavailable,
  subscribeToNetworkStatus,
  trackedFetch,
} from "./network-status";

function mockOnline(value: boolean) {
  return vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

describe("offline network-status", () => {
  beforeEach(() => {
    mockOnline(true);
    markConnectionAvailable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("публикует событие только при реальном изменении статуса", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToNetworkStatus(listener);

    markConnectionUnavailable();
    markConnectionUnavailable();
    markConnectionAvailable();
    unsubscribe();
    markConnectionUnavailable();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, "unavailable");
    expect(listener).toHaveBeenNthCalledWith(2, "connected");
    expect(getNetworkStatus()).toBe("unavailable");
  });

  it("распознаёт типовые offline-ошибки", () => {
    expect(isNetworkUnavailableError(new TypeError("failed"))).toBe(true);
    expect(isNetworkUnavailableError({ status: 503 })).toBe(true);
    expect(isNetworkUnavailableError(new Error("proxy timeout"))).toBe(true);

    vi.restoreAllMocks();
    mockOnline(false);

    expect(isNetworkUnavailableError(new Error("anything"))).toBe(true);
  });

  it("trackedFetch помечает соединение доступным при успешном сетевом ответе", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))),
    );
    markConnectionUnavailable();

    await trackedFetch("/api/ok");

    expect(getNetworkStatus()).toBe("connected");
  });

  it("trackedFetch помечает соединение недоступным для cache response offline", async () => {
    vi.restoreAllMocks();
    mockOnline(false);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response("{}", {
            status: 200,
            headers: { "x-aris-response-source": "cache" },
          }),
        ),
      ),
    );
    markConnectionAvailable();

    await trackedFetch("/api/cache");

    expect(getNetworkStatus()).toBe("unavailable");
  });

  it("trackedFetch не глотает AbortError и не переводит статус в offline", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(abortError)),
    );
    markConnectionAvailable();

    await expect(trackedFetch("/api/abort")).rejects.toBe(abortError);
    expect(getNetworkStatus()).toBe("connected");
  });
});
