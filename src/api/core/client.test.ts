import { afterEach, describe, expect, it, vi } from "vitest";
import { trackedFetch } from "../../state/network-status";
import { captureAppException } from "../../utils/sentry";
import { ApiError, apiRequest, createApiError, parseJson } from "./client";

vi.mock("../../state/network-status", () => ({
  trackedFetch: vi.fn(),
}));

vi.mock("../../utils/sentry", () => ({
  captureAppException: vi.fn(),
}));

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string>) },
  });
}

describe("api core client", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("parseJson возвращает fallback для пустого тела", async () => {
    await expect(parseJson(new Response(""), { ok: true })).resolves.toEqual({ ok: true });
  });

  it("parseJson превращает невалидный JSON в error payload", async () => {
    await expect(parseJson(new Response("backend down"), {})).resolves.toEqual({
      error: "backend down",
    });
  });

  it("createApiError берёт сообщение из error-поля", () => {
    const error = createApiError("fallback", 400, { error: "bad request" });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("bad request");
    expect(error.status).toBe(400);
    expect(error.data).toEqual({ error: "bad request" });
  });

  it("apiRequest сериализует object body в JSON", async () => {
    vi.mocked(trackedFetch).mockResolvedValue(jsonResponse({ id: 1 }));

    await expect(
      apiRequest("/api/demo", { method: "POST", body: { title: "Hello" } }),
    ).resolves.toEqual({
      id: 1,
    });

    expect(trackedFetch).toHaveBeenCalledWith("/api/demo", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ title: "Hello" }),
      headers: { "Content-Type": "application/json" },
    });
  });

  it("apiRequest не перезаписывает BodyInit и переданные headers", async () => {
    vi.mocked(trackedFetch).mockResolvedValue(jsonResponse({ ok: true }));
    const body = new URLSearchParams({ q: "test" });

    await apiRequest("/api/search", {
      method: "POST",
      body,
      headers: { "X-Test": "1" },
    });

    expect(trackedFetch).toHaveBeenCalledWith("/api/search", {
      method: "POST",
      credentials: "include",
      body,
      headers: { "X-Test": "1" },
    });
  });

  it("дедуплицирует одновременные GET-запросы без AbortSignal", async () => {
    vi.mocked(trackedFetch).mockResolvedValue(jsonResponse({ ok: true }));

    const first = apiRequest("/api/shared");
    const second = apiRequest("/api/shared");

    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(trackedFetch).toHaveBeenCalledTimes(1);
  });

  it("не дедуплицирует запросы с AbortSignal", async () => {
    vi.mocked(trackedFetch)
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const signal = new AbortController().signal;

    await Promise.all([
      apiRequest("/api/signal", { signal }),
      apiRequest("/api/signal", { signal }),
    ]);

    expect(trackedFetch).toHaveBeenCalledTimes(2);
  });

  it("бросает ApiError и репортит 5xx", async () => {
    vi.mocked(trackedFetch).mockResolvedValue(
      jsonResponse({ error: "server exploded" }, { status: 503 }),
    );

    await expect(apiRequest("/api/fail")).rejects.toMatchObject({
      message: "server exploded",
      status: 503,
    });
    expect(captureAppException).toHaveBeenCalledTimes(1);
  });
});
